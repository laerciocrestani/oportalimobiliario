<?php

namespace App\Services;

use App\Enums\ProposalDecision;
use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @see REQ-RTL-005
 * @see REQ-RTL-008
 * @see REQ-RTL-009
 * @see REQ-RTL-010
 * @see REQ-RTL-011
 */
class ReservationProposalService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
        private readonly UserActivityCatalog $activityCatalog,
        private readonly ReservationGarageService $garageService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $files
     */
    public function submit(User $broker, Reservation $reservation, array $data, array $files): Reservation
    {
        if ($reservation->broker_id !== $broker->id) {
            abort(403, 'Forbidden.');
        }

        if (! $reservation->canSubmitProposal()) {
            abort(422, 'Reservation is not open for proposal submission.');
        }

        if ($reservation->isPreHold() && $reservation->isExpired()) {
            abort(422, 'Sua pré-reserva expirou. A unidade está disponível novamente.');
        }

        foreach ($files as $file) {
            $this->validateProposalFile($file);
        }

        return DB::transaction(function () use ($broker, $reservation, $data, $files) {
            $version = (int) $reservation->proposals()->max('version') + 1;

            $proposal = $reservation->proposals()->create([
                'version' => $version,
                'client_name' => $data['client_name'],
                'client_email' => $this->optionalString($data, 'client_email'),
                'client_phone' => $data['client_phone'],
                'client_cpf' => $this->optionalString($data, 'client_cpf'),
                'address' => $this->optionalString($data, 'address'),
                'city' => $this->optionalString($data, 'city'),
                'state' => strtoupper($this->optionalString($data, 'state')),
                'zip' => $this->optionalString($data, 'zip'),
                'marital_status' => $this->optionalString($data, 'marital_status'),
                'nationality' => $this->optionalString($data, 'nationality'),
                'land_value' => $data['land_value'] ?? 0,
                'payment_terms' => $data['payment_terms'],
                'submitted_by' => $broker->id,
            ]);

            $attachmentIds = [];
            $attachmentNames = [];

            foreach ($files as $file) {
                $path = $this->storeFile($reservation, $file);

                $attachment = $reservation->attachments()->create([
                    'kind' => ReservationAttachmentKind::Proposal,
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => (string) $file->getMimeType(),
                    'size_bytes' => (int) $file->getSize(),
                    'uploaded_by' => $broker->id,
                ]);

                $attachmentIds[] = $attachment->id;
                $attachmentNames[] = $attachment->original_name;
            }

            $reservation->update([
                'status' => ReservationStatus::ProposalPending,
                'expires_at' => null,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ProposalSubmitted,
                $broker,
                [
                    'proposal_id' => $proposal->id,
                    'attachment_ids' => $attachmentIds,
                    'attachment_names' => $attachmentNames,
                ],
            );

            return $reservation->fresh(['unit', 'proposals', 'attachments']);
        });
    }

    public function decide(
        User $builder,
        Reservation $reservation,
        ProposalDecision $decision,
        ?string $decisionNote = null,
        ?UploadedFile $signedFile = null,
    ): Reservation {
        if (! $reservation->isProposalPending()) {
            abort(422, 'Reservation has no pending proposal.');
        }

        $proposal = $reservation->proposals()
            ->whereNull('decision')
            ->latest('version')
            ->first();

        if ($proposal === null) {
            abort(422, 'Pending proposal not found.');
        }

        if ($decision === ProposalDecision::Accepted) {
            if ($signedFile === null) {
                abort(422, 'Envie o PDF da proposta assinado pela construtora.');
            }

            $this->validateSignedPdf($signedFile);
        }

        return DB::transaction(function () use ($builder, $reservation, $proposal, $decision, $decisionNote, $signedFile) {
            $proposal->update([
                'decision' => $decision,
                'decision_note' => $decisionNote,
                'decided_by' => $builder->id,
                'decided_at' => now(),
            ]);

            return match ($decision) {
                ProposalDecision::Accepted => $this->accept($builder, $reservation, $proposal, $signedFile),
                ProposalDecision::Rejected => $this->reject($builder, $reservation, $proposal),
                ProposalDecision::Returned => $this->returnToBroker($builder, $reservation, $proposal),
            };
        });
    }

    /**
     * @see REQ-RPF-012
     */
    public function returnSigned(
        User $broker,
        Reservation $reservation,
        UploadedFile $signedFile,
        ?UploadedFile $depositProof = null,
    ): Reservation {
        if ($reservation->broker_id !== $broker->id) {
            abort(403, 'Forbidden.');
        }

        if (! $reservation->canReturnSignedProposal()) {
            abort(422, 'A proposta ainda não pode ser devolvida assinada.');
        }

        $this->validateSignedPdf($signedFile);

        if ($depositProof !== null && ! $reservation->canSubmitDepositProof()) {
            abort(422, 'Reservation is not open for deposit proof submission.');
        }

        return DB::transaction(function () use ($broker, $reservation, $signedFile, $depositProof) {
            $path = $this->storeFile($reservation, $signedFile);

            $attachment = $reservation->attachments()->create([
                'kind' => ReservationAttachmentKind::ProposalSignedBoth,
                'path' => $path,
                'original_name' => $signedFile->getClientOriginalName(),
                'mime_type' => (string) $signedFile->getMimeType(),
                'size_bytes' => (int) $signedFile->getSize(),
                'uploaded_by' => $broker->id,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ProposalSignedBoth,
                $broker,
                ['attachment_id' => $attachment->id],
            );

            if ($depositProof !== null) {
                return app(ReservationDepositService::class)->submitProof($broker, $reservation->fresh(), $depositProof);
            }

            return $reservation->fresh(['unit', 'attachments', 'proposals']);
        });
    }

    private function accept(
        User $builder,
        Reservation $reservation,
        ReservationProposal $proposal,
        ?UploadedFile $signedFile,
    ): Reservation {
        if ($signedFile === null) {
            abort(422, 'Envie o PDF da proposta assinado pela construtora.');
        }

        $client = $this->resolveClientFromProposal($reservation, $proposal);

        $unit = Unit::query()
            ->withoutGlobalScope('tenant')
            ->lockForUpdate()
            ->findOrFail($reservation->unit_id);

        if ($unit->status !== UnitStatus::PreReserved) {
            abort(422, 'Unidade não está mais disponível.');
        }

        $unit->update(['status' => UnitStatus::Reserved]);
        $this->garageService->syncStatus($reservation, UnitStatus::Reserved);

        $reservation->update([
            'client_id' => $client->id,
            'status' => ReservationStatus::DepositPending,
            'expires_at' => null,
        ]);

        $path = $this->storeFile($reservation, $signedFile);

        $signedAttachment = $reservation->attachments()->create([
            'kind' => ReservationAttachmentKind::ProposalSignedBuilder,
            'path' => $path,
            'original_name' => $signedFile->getClientOriginalName(),
            'mime_type' => (string) $signedFile->getMimeType(),
            'size_bytes' => (int) $signedFile->getSize(),
            'uploaded_by' => $builder->id,
        ]);

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::ProposalAccepted,
            $builder,
            [
                'proposal_id' => $proposal->id,
                'attachment_id' => $signedAttachment->id,
            ],
        );

        return $reservation->fresh(['unit', 'client', 'proposals', 'attachments']);
    }

    private function reject(User $builder, Reservation $reservation, ReservationProposal $proposal): Reservation
    {
        $unit = Unit::query()
            ->withoutGlobalScope('tenant')
            ->lockForUpdate()
            ->find($reservation->unit_id);

        if ($unit !== null && $unit->status === UnitStatus::PreReserved) {
            $unit->update(['status' => UnitStatus::Available]);
        }

        $this->garageService->detachAndRelease($reservation);

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::ProposalRejected,
            $builder,
            ['proposal_id' => $proposal->id, 'note' => $proposal->decision_note],
        );

        $this->postDecisionToDialogue($builder, $reservation, ProposalDecision::Rejected, $proposal->decision_note);

        $reservation->update([
            'status' => ReservationStatus::Cancelled,
            'expires_at' => null,
        ]);

        return $reservation->fresh(['unit', 'proposals']);
    }

    private function returnToBroker(User $builder, Reservation $reservation, ReservationProposal $proposal): Reservation
    {
        $reservation->update(['status' => ReservationStatus::ProposalReturned]);

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::ProposalReturned,
            $builder,
            ['proposal_id' => $proposal->id, 'note' => $proposal->decision_note],
        );

        $this->postDecisionToDialogue($builder, $reservation, ProposalDecision::Returned, $proposal->decision_note);

        return $reservation->fresh(['unit', 'proposals']);
    }

    private function resolveClientFromProposal(Reservation $reservation, ReservationProposal $proposal): BrokerClient
    {
        if ($reservation->client_id !== null) {
            $attached = BrokerClient::query()
                ->where('broker_id', $reservation->broker_id)
                ->whereKey($reservation->client_id)
                ->first();

            if ($attached !== null) {
                $attached->update([
                    'name' => $proposal->client_name,
                    'phone' => $proposal->client_phone,
                    ...($proposal->client_email !== '' ? ['email' => $proposal->client_email] : []),
                ]);

                return $attached;
            }
        }

        if ($proposal->client_email !== '') {
            $existing = BrokerClient::query()
                ->where('broker_id', $reservation->broker_id)
                ->where('email', $proposal->client_email)
                ->first();

            if ($existing !== null) {
                $existing->update([
                    'name' => $proposal->client_name,
                    'phone' => $proposal->client_phone,
                ]);

                return $existing;
            }
        }

        return BrokerClient::query()->create([
            'broker_id' => $reservation->broker_id,
            'name' => $proposal->client_name,
            'phone' => $proposal->client_phone,
            'email' => $proposal->client_email !== '' ? $proposal->client_email : null,
        ]);
    }

    private function postDecisionToDialogue(
        User $builder,
        Reservation $reservation,
        ProposalDecision $decision,
        ?string $note,
    ): void {
        $trimmed = trim((string) $note);
        $body = $decision->dialogueMessage($trimmed);

        if ($body === null || $trimmed === '') {
            return;
        }

        $reservation->messages()->create([
            'user_id' => $builder->id,
            'body' => $body,
        ]);

        $this->timelineService->recordDialogue($reservation, $builder);
        $this->activityCatalog->recordMessageSent($builder, $reservation, $body);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function optionalString(array $data, string $key): string
    {
        $value = $data[$key] ?? '';

        return is_string($value) ? trim($value) : (string) $value;
    }

    private function storeFile(Reservation $reservation, UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension() ?: $file->extension();
        $path = sprintf(
            'reservations/%d/%d/%s.%s',
            $reservation->tenant_id,
            $reservation->id,
            Str::uuid(),
            $extension,
        );

        Storage::disk('local')->put($path, $file->get());

        return $path;
    }

    private function validateProposalFile(UploadedFile $file): void
    {
        $mimeType = (string) $file->getMimeType();
        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

        if (! in_array($mimeType, $allowed, true)) {
            abort(422, 'Formato inválido. Use JPEG, PNG, WebP ou PDF.');
        }

        $sizeKb = (int) ceil($file->getSize() / 1024);

        if ($sizeKb > 10_240) {
            abort(422, 'Arquivo excede o limite de 10MB.');
        }
    }

    private function validateSignedPdf(UploadedFile $file): void
    {
        if ((string) $file->getMimeType() !== 'application/pdf') {
            abort(422, 'Envie o PDF assinado.');
        }

        $sizeKb = (int) ceil($file->getSize() / 1024);

        if ($sizeKb > 10_240) {
            abort(422, 'Arquivo excede o limite de 10MB.');
        }
    }
}
