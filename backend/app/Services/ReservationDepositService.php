<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @see REQ-RTL-013
 * @see REQ-RTL-015
 * @see REQ-RTL-016
 */
class ReservationDepositService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
    ) {}

    public function submitProof(User $broker, Reservation $reservation, UploadedFile $file): Reservation
    {
        if ($reservation->broker_id !== $broker->id) {
            abort(403, 'Forbidden.');
        }

        if (! $reservation->canSubmitDepositProof()) {
            abort(422, 'Reservation is not open for deposit proof submission.');
        }

        $this->validateDepositProofFile($file);

        return DB::transaction(function () use ($broker, $reservation, $file) {
            $path = $this->storeFile($reservation, $file);

            $attachment = $reservation->attachments()->create([
                'kind' => ReservationAttachmentKind::DepositProof,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => (string) $file->getMimeType(),
                'size_bytes' => (int) $file->getSize(),
                'uploaded_by' => $broker->id,
            ]);

            $reservation->update([
                'status' => ReservationStatus::DepositProofPending,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::DepositProofSubmitted,
                $broker,
                ['attachment_id' => $attachment->id],
            );

            return $reservation->fresh(['unit', 'attachments']);
        });
    }

    public function approveProof(User $builder, Reservation $reservation): Reservation
    {
        if (! $reservation->isDepositProofPending()) {
            abort(422, 'Reservation has no pending deposit proof.');
        }

        $attachment = $reservation->attachments()
            ->where('kind', ReservationAttachmentKind::DepositProof)
            ->latest('id')
            ->first();

        if ($attachment === null) {
            abort(422, 'Deposit proof attachment not found.');
        }

        return DB::transaction(function () use ($builder, $reservation, $attachment) {
            $reservation->update([
                'status' => ReservationStatus::ContractDataPending,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::DepositProofApproved,
                $builder,
                ['attachment_id' => $attachment->id],
            );

            return $reservation->fresh(['unit', 'attachments']);
        });
    }

    public function checkOverdueDepositWindows(): int
    {
        $reservations = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->where('status', ReservationStatus::DepositPending)
            ->where('expires_at', '<=', now())
            ->get();

        $count = 0;

        foreach ($reservations as $reservation) {
            if ($this->timelineService->hasEventType($reservation, ReservationTimelineEventType::DepositProofSubmitted)) {
                continue;
            }

            if ($this->timelineService->hasEventType($reservation, ReservationTimelineEventType::DepositOverdue)) {
                continue;
            }

            $this->timelineService->record($reservation, ReservationTimelineEventType::DepositOverdue);
            $count++;
        }

        return $count;
    }

    public function storeFile(Reservation $reservation, UploadedFile $file): string
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

    public function validateDepositProofFile(UploadedFile $file): void
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

    public function latestDepositProof(Reservation $reservation): ?ReservationAttachment
    {
        return $reservation->attachments()
            ->where('kind', ReservationAttachmentKind::DepositProof)
            ->latest('id')
            ->first();
    }
}
