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

    public function uploadBuilderSigned(User $builder, Reservation $reservation, UploadedFile $file): Reservation
    {
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

        return DB::transaction(function () use ($builder, $reservation, $file) {
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
                ['attachment_id' => $attachment->id],
            );

            return $reservation->fresh(['unit', 'attachments']);
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

        return DB::transaction(function () use ($builder, $reservation, $attachment, $note) {
            $unit = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($reservation->unit_id);

            if ($unit->status !== UnitStatus::Reserved) {
                abort(422, 'Unidade não está reservada.');
            }

            $unit->update(['status' => UnitStatus::Sold]);

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

            return $reservation->fresh(['unit', 'attachments']);
        });
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
