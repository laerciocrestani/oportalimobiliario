<?php

namespace App\Services;

use App\Enums\DepositKind;
use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureSignerRole;
use App\Enums\SignatureSignerStatus;
use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\ReservationTimelineEvent;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Models\TenantSignatureSetting;
use App\Models\Unit;
use App\Models\User;
use App\Services\ZapSign\ZapSignClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * @see REQ-RDP-006
 */
class ProposalSignatureService
{
    public function __construct(
        private readonly ZapSignClient $zapSign,
        private readonly ReservationTimelineService $timelineService,
        private readonly ReservationGarageService $garageService,
        private readonly SignatureLinkNotifier $links,
    ) {}

    public function send(int $reservationId): void
    {
        $reservation = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->with(['proposals', 'broker', 'unit'])
            ->find($reservationId);

        if ($reservation === null || ! $reservation->isProposalSigning()) {
            return;
        }

        $document = SignatureDocument::query()
            ->withoutGlobalScope('tenant')
            ->firstOrCreate(
                [
                    'reservation_id' => $reservation->id,
                    'kind' => SignatureDocumentKind::Proposal,
                ],
                [
                    'tenant_id' => $reservation->tenant_id,
                    'reference' => $reservation->tenant_id.':'.$reservation->id.':proposal',
                    'status' => SignatureDocumentStatus::Pending,
                ],
            );

        if ($document->status === SignatureDocumentStatus::Sent && $document->provider_document_id !== null) {
            return;
        }

        try {
            $signers = $this->signersFor($reservation);
            $pdf = $this->pdfBytes($reservation);
            $created = $this->zapSign->createDocument(
                'Proposta '.$reservation->unit?->code,
                $pdf,
                $document->reference,
                $signers,
            );

            DB::transaction(function () use ($document, $reservation, $signers, $created): void {
                $document->update([
                    'provider_document_id' => $created['token'],
                    'status' => SignatureDocumentStatus::Sent,
                    'error' => null,
                ]);

                foreach ($signers as $signer) {
                    $remote = $created['signers'][$signer['key'] ?? $signer['role']];

                    SignatureSigner::query()
                        ->withoutGlobalScope('tenant')
                        ->updateOrCreate(
                            [
                                'signature_document_id' => $document->id,
                                'role' => $signer['role'],
                            ],
                            [
                                'tenant_id' => $reservation->tenant_id,
                                'signer_key' => $signer['key'] ?? $signer['role'],
                                'name' => $signer['name'],
                                'phone' => $signer['phone'] !== '' ? $signer['phone'] : null,
                                'email' => $signer['email'] !== '' ? $signer['email'] : null,
                                'status' => SignatureSignerStatus::Pending,
                                'provider_signer_id' => $remote['token'],
                                'sign_url' => $remote['sign_url'],
                            ],
                        );
                }
            });
        } catch (Throwable $exception) {
            $document->update([
                'status' => SignatureDocumentStatus::Failed,
                'error' => $exception->getMessage(),
            ]);

            return;
        }

        $document->unsetRelation('signers');
        $this->links->notifyPending($document->fresh() ?? $document);
    }

    public function resendPendingLinks(Reservation $reservation): int
    {
        if (! $reservation->isProposalSigning()) {
            abort(422, 'A proposta não está aguardando assinatura.');
        }

        $document = SignatureDocument::query()
            ->withoutGlobalScope('tenant')
            ->where('reservation_id', $reservation->id)
            ->where('kind', SignatureDocumentKind::Proposal)
            ->where('status', SignatureDocumentStatus::Sent)
            ->first();

        if ($document === null) {
            abort(422, 'O documento ainda não foi enviado para assinatura.');
        }

        $notified = $this->links->notifyPending($document);

        if ($notified === 0) {
            abort(422, 'Não há signatário pendente com link para reenviar.');
        }

        return $notified;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function applyWebhook(array $payload): void
    {
        $documentToken = is_string($payload['token'] ?? null) ? $payload['token'] : '';
        $externalId = is_string($payload['external_id'] ?? null) ? $payload['external_id'] : '';
        $signerToken = $this->signerToken($payload);
        $next = $this->incomingStatus($payload);

        $document = SignatureDocument::query()
            ->withoutGlobalScope('tenant')
            ->where(function ($query) use ($documentToken, $externalId): void {
                if ($documentToken !== '') {
                    $query->orWhere('provider_document_id', $documentToken);
                }

                if ($externalId !== '') {
                    $query->orWhere('reference', $externalId);
                }
            })
            ->first();

        if ($document === null) {
            abort(404, 'Documento de assinatura não encontrado.');
        }

        if ($signerToken === '') {
            abort(422, 'Signatário não encontrado neste documento.');
        }

        DB::transaction(function () use ($document, $signerToken, $next): void {
            $signer = SignatureSigner::query()
                ->withoutGlobalScope('tenant')
                ->where('signature_document_id', $document->id)
                ->where('provider_signer_id', $signerToken)
                ->lockForUpdate()
                ->first();

            if ($signer === null) {
                abort(422, 'Signatário não encontrado neste documento.');
            }

            if ($signer->status === SignatureSignerStatus::Signed || $signer->status === $next) {
                return;
            }

            $signer->update(['status' => $next]);

            if ($next !== SignatureSignerStatus::Signed) {
                return;
            }

            $waiting = SignatureSigner::query()
                ->withoutGlobalScope('tenant')
                ->where('signature_document_id', $document->id)
                ->where('status', '!=', SignatureSignerStatus::Signed->value)
                ->exists();

            if ($waiting) {
                return;
            }

            $this->advanceAfterProposalSignatures($document);
        });
    }

    private function advanceAfterProposalSignatures(SignatureDocument $document): void
    {
        $reservation = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->lockForUpdate()
            ->find($document->reservation_id);

        if ($reservation === null || ! $reservation->isProposalSigning()) {
            return;
        }

        $unit = Unit::query()
            ->withoutGlobalScope('tenant')
            ->lockForUpdate()
            ->find($reservation->unit_id);

        if ($unit !== null && $unit->status === UnitStatus::PreReserved) {
            $unit->update(['status' => UnitStatus::Reserved]);
        }

        $this->garageService->syncStatus($reservation, UnitStatus::Reserved);

        $reservation->update([
            'status' => $this->depositKind($reservation) === DepositKind::Asset
                ? ReservationStatus::ContractDataPending
                : ReservationStatus::DepositPending,
            'expires_at' => null,
        ]);

        $alreadyRecorded = ReservationTimelineEvent::query()
            ->where('reservation_id', $reservation->id)
            ->where('type', ReservationTimelineEventType::ProposalSignedBoth)
            ->exists();

        if ($alreadyRecorded) {
            return;
        }

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::ProposalSignedBoth,
            null,
            ['signature_document_id' => $document->id],
        );
    }

    private function depositKind(Reservation $reservation): DepositKind
    {
        $kind = $reservation->proposals()->latest('version')->value('deposit_kind');

        return $kind instanceof DepositKind ? $kind : DepositKind::tryFrom((string) $kind) ?? DepositKind::Pix;
    }

    /**
     * @return list<array{role: string, name: string, phone: string, email: string}>
     */
    private function signersFor(Reservation $reservation): array
    {
        $proposal = $reservation->proposals->sortByDesc('version')->first();

        if ($proposal === null || trim((string) $proposal->client_name) === '' || trim((string) $proposal->client_phone) === '') {
            throw new RuntimeException('A proposta não tem nome e telefone do cliente.');
        }

        $setting = TenantSignatureSetting::query()
            ->withoutGlobalScope('tenant')
            ->where('tenant_id', $reservation->tenant_id)
            ->first();

        $builder = $setting?->proposal_signer_user_id !== null
            ? User::query()->find($setting->proposal_signer_user_id)
            : null;

        if ($builder === null) {
            throw new RuntimeException('Defina o signatário da proposta em Assinaturas.');
        }

        $broker = $reservation->broker;

        if ($broker === null) {
            throw new RuntimeException('A reserva não tem corretor da venda.');
        }

        return [
            $this->signer(SignatureSignerRole::Buyer, (string) $proposal->client_name, (string) $proposal->client_phone, (string) $proposal->client_email),
            $this->signer(SignatureSignerRole::Builder, $builder->name, (string) $builder->phone, (string) $builder->email),
            $this->signer(SignatureSignerRole::Broker, $broker->name, (string) $broker->phone, (string) $broker->email),
        ];
    }

    /**
     * @return array{role: string, name: string, phone: string, email: string}
     */
    private function signer(SignatureSignerRole $role, string $name, string $phone, string $email): array
    {
        return [
            'role' => $role->value,
            'name' => trim($name),
            'phone' => preg_replace('/\D+/', '', $phone) ?? '',
            'email' => trim($email),
        ];
    }

    private function pdfBytes(Reservation $reservation): string
    {
        $attachment = $reservation->attachments()
            ->where('kind', ReservationAttachmentKind::ProposalPdf)
            ->latest('id')
            ->first();

        if ($attachment === null || ! Storage::disk('local')->exists($attachment->path)) {
            throw new RuntimeException('O PDF da proposta não foi gerado.');
        }

        $pdf = Storage::disk('local')->get($attachment->path);

        if (! is_string($pdf) || $pdf === '') {
            throw new RuntimeException('O PDF da proposta não foi gerado.');
        }

        return $pdf;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function signerToken(array $payload): string
    {
        $nested = $payload['signer_who_signed'] ?? $payload['signer'] ?? null;
        $token = $payload['signer_token'] ?? (is_array($nested) ? ($nested['token'] ?? null) : null);

        return is_string($token) ? $token : '';
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function incomingStatus(array $payload): SignatureSignerStatus
    {
        $nested = $payload['signer_who_signed'] ?? $payload['signer'] ?? null;
        $raw = $payload['status'] ?? (is_array($nested) ? ($nested['status'] ?? null) : null);
        $event = is_string($payload['event_type'] ?? null) ? $payload['event_type'] : '';

        if (! is_string($raw) || $raw === '') {
            $raw = match ($event) {
                'doc_signed' => 'signed',
                'doc_refused', 'signer_refused' => 'refused',
                default => '',
            };
        }

        return match ($raw) {
            'signed' => SignatureSignerStatus::Signed,
            'refused', 'rejected' => SignatureSignerStatus::Refused,
            default => abort(422, 'Status de assinatura não reconhecido.'),
        };
    }
}
