<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @see REQ-RTL-020
 * @see REQ-RTL-021
 * @see REQ-RTL-022
 */
class ReservationContractCompletionService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
        private readonly ReservationGarageService $garageService,
    ) {}

    public function markSignedGov(User $broker, Reservation $reservation, ?string $note = null): Reservation
    {
        if ($reservation->broker_id !== $broker->id) {
            abort(403, 'Forbidden.');
        }

        if (! $reservation->canMarkSignedGov()) {
            abort(422, 'Reservation is not open for GOV signature registration.');
        }

        if ($this->timelineService->hasEventType($reservation, ReservationTimelineEventType::ContractSignedGov)) {
            abort(422, 'GOV signature is already registered.');
        }

        return DB::transaction(function () use ($broker, $reservation, $note) {
            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ContractSignedGov,
                $broker,
                [
                    'client_signed' => true,
                    'broker_signed' => true,
                    'note' => $note,
                ],
            );

            return $reservation->fresh(['unit', 'attachments']);
        });
    }

    public function uploadSigned(User $broker, Reservation $reservation, UploadedFile $file): Reservation
    {
        if ($reservation->broker_id !== $broker->id) {
            abort(403, 'Forbidden.');
        }

        if (! $reservation->canUploadSignedContract()) {
            abort(422, 'Reservation is not open for signed contract upload.');
        }

        if (! $this->timelineService->hasEventType($reservation, ReservationTimelineEventType::ContractSignedGov)) {
            abort(422, 'Registre a assinatura GOV do cliente e do corretor antes de enviar o PDF.');
        }

        $this->validateSignedPdf($file);

        return DB::transaction(function () use ($broker, $reservation, $file) {
            $path = $this->storeFile($reservation, $file);

            $attachment = $reservation->attachments()->create([
                'kind' => ReservationAttachmentKind::ContractSigned,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => (string) $file->getMimeType(),
                'size_bytes' => (int) $file->getSize(),
                'uploaded_by' => $broker->id,
            ]);

            $reservation->update([
                'status' => ReservationStatus::ContractUploaded,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ContractUploaded,
                $broker,
                ['attachment_id' => $attachment->id],
            );

            return $reservation->fresh(['unit', 'attachments']);
        });
    }

    public function uploadBuilderSigned(
        User $builder,
        Reservation $reservation,
        UploadedFile $file,
        int $witness1UserId,
        int $witness2UserId,
    ): Reservation {
        if (! $reservation->canUploadBuilderSignedContract()) {
            abort(422, 'Reservation is not open for builder signed contract upload.');
        }

        if ($this->timelineService->hasEventType($reservation, ReservationTimelineEventType::ContractBuilderSigned)) {
            abort(422, 'O contrato assinado pela construtora já foi enviado.');
        }

        $buyerAttachment = $this->latestSignedContract($reservation);

        if ($buyerAttachment === null) {
            abort(422, 'Envie o contrato assinado pelo comprador antes da assinatura da construtora.');
        }

        $this->validateSignedPdf($file);

        return DB::transaction(function () use ($builder, $reservation, $file, $witness1UserId, $witness2UserId) {
            $this->syncWitnesses($builder, $reservation, $witness1UserId, $witness2UserId);

            $path = $this->storeFile($reservation, $file);

            $attachment = $reservation->attachments()->create([
                'kind' => ReservationAttachmentKind::ContractSignedBuilder,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => (string) $file->getMimeType(),
                'size_bytes' => (int) $file->getSize(),
                'uploaded_by' => $builder->id,
            ]);

            $reservation->update([
                'status' => ReservationStatus::ContractBuilderSigned,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ContractBuilderSigned,
                $builder,
                [
                    'attachment_id' => $attachment->id,
                    'witness_1_user_id' => $witness1UserId,
                    'witness_2_user_id' => $witness2UserId,
                ],
            );

            return $reservation->fresh(['unit', 'attachments', 'witnesses.user']);
        });
    }

    public function assignWitnesses(
        User $builder,
        Reservation $reservation,
        int $witness1UserId,
        int $witness2UserId,
    ): Reservation {
        if (! $reservation->isContractUploaded() && ! $reservation->isContractBuilderSigned()) {
            abort(422, 'Reservation is not open for witness assignment.');
        }

        return DB::transaction(function () use ($builder, $reservation, $witness1UserId, $witness2UserId) {
            $this->syncWitnesses($builder, $reservation, $witness1UserId, $witness2UserId);

            return $reservation->fresh(['unit', 'attachments', 'witnesses.user']);
        });
    }

    public function signAsWitness(User $user, Reservation $reservation, int $slot): Reservation
    {
        if (! in_array($slot, [1, 2], true)) {
            abort(422, 'Slot de testemunha inválido.');
        }

        if (! $reservation->isContractBuilderSigned()) {
            abort(422, 'A construtora precisa assinar o contrato antes das testemunhas.');
        }

        if ($slot === 2) {
            $first = $reservation->witnessForSlot(1);

            if ($first === null || ! $first->hasSigned()) {
                abort(422, 'A testemunha 1 precisa assinar antes da testemunha 2.');
            }
        }

        $witness = $reservation->witnessForSlot($slot);

        if ($witness === null) {
            abort(422, 'Nenhuma testemunha definida para este lugar.');
        }

        if ((int) $witness->user_id !== (int) $user->id) {
            abort(403, 'Forbidden.');
        }

        if ($witness->hasSigned()) {
            abort(422, 'Esta testemunha já registrou a assinatura.');
        }

        return DB::transaction(function () use ($user, $reservation, $witness, $slot) {
            $witness->update(['signed_at' => now()]);

            $this->timelineService->record(
                $reservation,
                $slot === 1
                    ? ReservationTimelineEventType::ContractWitness1Signed
                    : ReservationTimelineEventType::ContractWitness2Signed,
                $user,
                [
                    'slot' => $slot,
                    'witness_user_id' => $user->id,
                ],
            );

            return $reservation->fresh(['unit', 'attachments', 'witnesses.user']);
        });
    }

    public function validate(User $builder, Reservation $reservation, ?string $note = null): Reservation
    {
        if (! $reservation->canValidateContract()) {
            abort(422, 'Reservation has no builder-signed contract pending confirmation.');
        }

        $attachment = $this->latestBuilderSignedContract($reservation);

        if ($attachment === null) {
            abort(422, 'Builder signed contract attachment not found.');
        }

        if ($this->latestSignedContract($reservation) === null) {
            abort(422, 'Contrato assinado pelo comprador não encontrado.');
        }

        if (! $reservation->hasAllWitnessSignatures()) {
            abort(422, 'As duas testemunhas precisam registrar a assinatura antes de marcar como vendida.');
        }

        return DB::transaction(function () use ($builder, $reservation, $attachment, $note) {
            $unit = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($reservation->unit_id);

            if ($unit->status !== UnitStatus::Reserved) {
                abort(422, 'Unidade não está reservada.');
            }

            $unit->update(['status' => UnitStatus::Sold]);
            $this->garageService->syncStatus($reservation, UnitStatus::Sold);

            $reservation->update([
                'status' => ReservationStatus::Sold,
                'expires_at' => null,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ContractValidated,
                $builder,
                [
                    'attachment_id' => $attachment->id,
                    'note' => $note,
                ],
            );
            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::Sold,
                $builder,
                ['unit_id' => $unit->id],
            );

            return $reservation->fresh(['unit', 'attachments', 'witnesses.user']);
        });
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    public function witnessCandidates(Reservation $reservation): array
    {
        return User::query()
            ->where('tenant_id', $reservation->tenant_id)
            ->where('role', 'builder')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $member) => [
                'id' => $member->id,
                'name' => $member->name,
            ])
            ->values()
            ->all();
    }

    private function syncWitnesses(
        User $actor,
        Reservation $reservation,
        int $witness1UserId,
        int $witness2UserId,
    ): void {
        $reservation->loadMissing('witnesses');

        if ($reservation->witnesses->contains(fn ($witness) => $witness->hasSigned())) {
            abort(422, 'Não é possível alterar testemunhas após uma assinatura.');
        }

        if ($witness1UserId === $witness2UserId) {
            abort(422, 'As testemunhas devem ser pessoas diferentes.');
        }

        $witness1 = $this->assertTeamMember($reservation, $witness1UserId);
        $witness2 = $this->assertTeamMember($reservation, $witness2UserId);

        $reservation->witnesses()->delete();

        $reservation->witnesses()->create([
            'user_id' => $witness1->id,
            'slot' => 1,
        ]);
        $reservation->witnesses()->create([
            'user_id' => $witness2->id,
            'slot' => 2,
        ]);

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::ContractWitnessesAssigned,
            $actor,
            [
                'witness_1_user_id' => $witness1->id,
                'witness_2_user_id' => $witness2->id,
            ],
        );
    }

    private function assertTeamMember(Reservation $reservation, int $userId): User
    {
        $member = User::query()
            ->where('id', $userId)
            ->where('tenant_id', $reservation->tenant_id)
            ->where('role', 'builder')
            ->first();

        if ($member === null) {
            abort(422, 'Testemunha deve ser um membro da equipe desta construtora.');
        }

        return $member;
    }

    public function latestSignedContract(Reservation $reservation): ?ReservationAttachment
    {
        return $reservation->attachments()
            ->where('kind', ReservationAttachmentKind::ContractSigned)
            ->latest('id')
            ->first();
    }

    public function latestBuilderSignedContract(Reservation $reservation): ?ReservationAttachment
    {
        return $reservation->attachments()
            ->where('kind', ReservationAttachmentKind::ContractSignedBuilder)
            ->latest('id')
            ->first();
    }

    private function storeFile(Reservation $reservation, UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension() ?: $file->extension() ?: 'pdf';
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

    private function validateSignedPdf(UploadedFile $file): void
    {
        $mimeType = (string) $file->getMimeType();

        if ($mimeType !== 'application/pdf') {
            abort(422, 'Formato inválido. Envie o contrato assinado em PDF.');
        }

        $sizeKb = (int) ceil($file->getSize() / 1024);

        if ($sizeKb > 10_240) {
            abort(422, 'Arquivo excede o limite de 10MB.');
        }
    }
}
