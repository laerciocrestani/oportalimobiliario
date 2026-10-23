<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Enums\SignatureSignerStatus;
use App\Mail\SignatureLinkMail;
use App\Models\SignatureDocument;
use App\Models\SignatureSigner;
use App\Support\BusinessClock;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * @see REQ-RDP-007
 */
class SignatureLinkNotifier
{
    public function __construct(private readonly WhatsAppCloudApiService $whatsapp) {}

    public function notifyPending(SignatureDocument $document): int
    {
        $signers = $document->relationLoaded('signers')
            ? $document->signers
            : $document->signers()->withoutGlobalScope('tenant')->get();

        $notified = 0;

        foreach ($signers as $signer) {
            if ($signer->status !== SignatureSignerStatus::Pending) {
                continue;
            }

            if ($this->notify($signer, $this->documentLabel($document))) {
                $notified++;
            }
        }

        return $notified;
    }

    public function remindOutstanding(): int
    {
        $notified = 0;

        SignatureDocument::query()
            ->withoutGlobalScope('tenant')
            ->where('status', SignatureDocumentStatus::Sent)
            ->where(function ($query): void {
                $query->where(function ($proposal): void {
                    $proposal->where('kind', SignatureDocumentKind::Proposal)
                        ->whereHas('reservation', function ($reservation): void {
                            $reservation->withoutGlobalScope('tenant')
                                ->where('status', ReservationStatus::ProposalSigning);
                        });
                })->orWhere(function ($contract): void {
                    $contract->where('kind', SignatureDocumentKind::Contract)
                        ->whereHas('reservation', function ($reservation): void {
                            $reservation->withoutGlobalScope('tenant')
                                ->where('status', ReservationStatus::ContractSigning);
                        });
                });
            })
            ->with(['signers' => function ($query): void {
                $query->withoutGlobalScope('tenant');
            }])
            ->orderBy('id')
            ->chunkById(100, function ($documents) use (&$notified): void {
                foreach ($documents as $document) {
                    $notified += $this->remindPending($document);
                }
            });

        return $notified;
    }

    public function remindPending(SignatureDocument $document): int
    {
        $startOfToday = now(BusinessClock::TIMEZONE)->startOfDay();
        $signers = $document->relationLoaded('signers')
            ? $document->signers
            : $document->signers()->withoutGlobalScope('tenant')->get();

        $notified = 0;

        foreach ($signers as $signer) {
            if ($signer->status !== SignatureSignerStatus::Pending) {
                continue;
            }

            $lastNotifiedAt = $signer->last_notified_at?->timezone(BusinessClock::TIMEZONE);

            if ($lastNotifiedAt !== null && $lastNotifiedAt->greaterThanOrEqualTo($startOfToday)) {
                continue;
            }

            if ($this->notify($signer, $this->documentLabel($document))) {
                $notified++;
            }
        }

        return $notified;
    }

    public function notify(SignatureSigner $signer, string $documentLabel = 'proposta'): bool
    {
        $url = trim((string) $signer->sign_url);

        if ($url === '') {
            return false;
        }

        $sent = false;
        $phone = trim((string) $signer->phone);
        $email = trim((string) $signer->email);

        if ($phone !== '') {
            try {
                $this->whatsapp->sendSignatureLink($phone, $signer->name, $url);
                $sent = true;
            } catch (Throwable) {
                // Um canal parado não impede o outro nem desfaz o envio ao ZapSign.
            }
        }

        if ($email !== '') {
            try {
                Mail::to($email)->send(new SignatureLinkMail($signer->name, $url, $documentLabel));
                $sent = true;
            } catch (Throwable) {
                //
            }
        }

        if ($sent) {
            $signer->update(['last_notified_at' => now()]);
        }

        return $sent;
    }

    private function documentLabel(SignatureDocument $document): string
    {
        return $document->kind === SignatureDocumentKind::Contract ? 'contrato' : 'proposta';
    }
}
