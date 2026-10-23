<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureSignerRole;
use App\Enums\SignatureSignerStatus;
use App\Enums\SignatureWitnessKind;
use App\Models\Reservation;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Models\TenantSignatureSetting;
use App\Models\TenantSignatureWitnessSlot;
use App\Models\User;
use App\Services\ZapSign\ZapSignClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * @see REQ-RDP-010
 */
class ContractSignatureService
{
    public function __construct(
        private readonly ZapSignClient $zapSign,
        private readonly SignatureLinkNotifier $links,
    ) {}

    public function send(int $reservationId): void
    {
        $reservation = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->with(['broker', 'unit'])
            ->find($reservationId);

        if ($reservation === null || (! $reservation->isContractIssued() && ! $reservation->isContractSigning())) {
            return;
        }

        $document = SignatureDocument::query()
            ->withoutGlobalScope('tenant')
            ->firstOrCreate(
                [
                    'reservation_id' => $reservation->id,
                    'kind' => SignatureDocumentKind::Contract,
                ],
                [
                    'tenant_id' => $reservation->tenant_id,
                    'reference' => $reservation->tenant_id.':'.$reservation->id.':contract',
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
                'Contrato '.$reservation->unit?->code,
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
                    $remote = $created['signers'][$signer['key']];

                    SignatureSigner::query()
                        ->withoutGlobalScope('tenant')
                        ->updateOrCreate(
                            [
                                'signature_document_id' => $document->id,
                                'signer_key' => $signer['key'],
                            ],
                            [
                                'tenant_id' => $reservation->tenant_id,
                                'role' => $signer['role'],
                                'name' => $signer['name'],
                                'phone' => $signer['phone'] !== '' ? $signer['phone'] : null,
                                'email' => $signer['email'] !== '' ? $signer['email'] : null,
                                'status' => SignatureSignerStatus::Pending,
                                'provider_signer_id' => $remote['token'],
                                'sign_url' => $remote['sign_url'],
                            ],
                        );
                }

                if ($reservation->isContractIssued()) {
                    $reservation->update([
                        'status' => ReservationStatus::ContractSigning,
                    ]);
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
        if (! $reservation->isContractSigning()) {
            abort(422, 'O contrato não está aguardando assinatura.');
        }

        $document = SignatureDocument::query()
            ->withoutGlobalScope('tenant')
            ->where('reservation_id', $reservation->id)
            ->where('kind', SignatureDocumentKind::Contract)
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
     * @return list<array{key: string, role: string, name: string, phone: string, email: string}>
     */
    private function signersFor(Reservation $reservation): array
    {
        $proposal = $reservation->proposals()->latest('version')->first();

        if ($proposal === null || trim((string) $proposal->client_name) === '' || trim((string) $proposal->client_phone) === '') {
            throw new RuntimeException('A proposta não tem nome e telefone do cliente.');
        }

        $setting = TenantSignatureSetting::query()
            ->withoutGlobalScope('tenant')
            ->where('tenant_id', $reservation->tenant_id)
            ->with('witnessSlots')
            ->first();

        $builder = $setting?->proposal_signer_user_id !== null
            ? User::query()->find($setting->proposal_signer_user_id)
            : null;

        if ($builder === null) {
            throw new RuntimeException('Defina o signatário da construtora em Assinaturas.');
        }

        $signers = [
            $this->signer(SignatureSignerRole::Buyer, 'buyer', (string) $proposal->client_name, (string) $proposal->client_phone, (string) $proposal->client_email),
            $this->signer(SignatureSignerRole::Builder, 'builder', $builder->name, (string) $builder->phone, (string) $builder->email),
        ];

        foreach ($setting->witnessSlots as $slot) {
            $person = $this->witness($reservation, $slot);
            $signers[] = $this->signer(
                SignatureSignerRole::Witness,
                'witness-'.$slot->position,
                $person->name,
                (string) $person->phone,
                (string) $person->email,
            );
        }

        return $signers;
    }

    private function witness(Reservation $reservation, TenantSignatureWitnessSlot $slot): User
    {
        if ($slot->kind === SignatureWitnessKind::SellingBroker) {
            $broker = $reservation->broker;

            if ($broker === null) {
                throw new RuntimeException('A reserva não tem corretor da venda.');
            }

            return $broker;
        }

        $user = $slot->user_id !== null ? User::query()->find($slot->user_id) : null;

        if ($user === null) {
            throw new RuntimeException('A testemunha da vaga '.$slot->position.' não foi encontrada.');
        }

        return $user;
    }

    /**
     * @return array{key: string, role: string, name: string, phone: string, email: string}
     */
    private function signer(SignatureSignerRole $role, string $key, string $name, string $phone, string $email): array
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            throw new RuntimeException('O signatário '.$name.' não tem telefone.');
        }

        return [
            'key' => $key,
            'role' => $role->value,
            'name' => trim($name),
            'phone' => $digits,
            'email' => trim($email),
        ];
    }

    private function pdfBytes(Reservation $reservation): string
    {
        $attachment = $reservation->attachments()
            ->where('kind', ReservationAttachmentKind::ContractPdf)
            ->latest('id')
            ->first();

        if ($attachment === null || ! Storage::disk('local')->exists($attachment->path)) {
            throw new RuntimeException('O PDF do contrato não foi gerado.');
        }

        $pdf = Storage::disk('local')->get($attachment->path);

        if (! is_string($pdf) || $pdf === '') {
            throw new RuntimeException('O PDF do contrato não foi gerado.');
        }

        return $pdf;
    }
}
