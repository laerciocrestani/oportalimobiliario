<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationTimelineEventType;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\User;
use App\Support\ReservationContractDataRules;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @see REQ-RTL-018
 */
class ReservationContractDataService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
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

        if (! $reservation->canSubmitContractData()) {
            abort(422, 'Reservation is not open for contract data submission.');
        }

        if ($this->timelineService->hasEventType($reservation, ReservationTimelineEventType::ContractDataSubmitted)) {
            abort(422, 'Contract data already submitted.');
        }

        foreach ($files as $file) {
            $this->validateDocumentationFile($file);
        }

        return DB::transaction(function () use ($broker, $reservation, $data, $files) {
            $reservation->loadMissing(['client', 'proposals']);
            $proposal = $reservation->proposals()->latest('version')->first();
            $client = $reservation->client;

            $payload = [
                'client_name' => $this->firstFilled(
                    $data['client_name'] ?? null,
                    $proposal?->client_name,
                    $client?->name,
                ),
                'client_phone' => $this->firstFilled(
                    $data['client_phone'] ?? null,
                    $proposal?->client_phone,
                    $client?->phone,
                ),
                'client_email' => trim((string) ($data['client_email'] ?? '')),
                'client_cpf' => preg_replace('/\D+/', '', (string) $data['client_cpf']) ?? '',
                'client_rg' => trim((string) ($data['client_rg'] ?? '')),
                'address' => (string) $data['address'],
                'city' => (string) $data['city'],
                'state' => strtoupper((string) $data['state']),
                'zip' => (string) $data['zip'],
                'marital_status' => (string) $data['marital_status'],
                'nationality' => (string) $data['nationality'],
                'spouse_name' => trim((string) ($data['spouse_name'] ?? '')),
                'spouse_phone' => trim((string) ($data['spouse_phone'] ?? '')),
                'spouse_email' => trim((string) ($data['spouse_email'] ?? '')),
                'spouse_cpf' => preg_replace('/\D+/', '', (string) ($data['spouse_cpf'] ?? '')) ?? '',
                'spouse_rg' => trim((string) ($data['spouse_rg'] ?? '')),
                'spouse_nationality' => trim((string) ($data['spouse_nationality'] ?? '')),
            ];

            if ($payload['marital_status'] !== ReservationContractDataRules::MARRIED) {
                $payload['spouse_name'] = '';
                $payload['spouse_phone'] = '';
                $payload['spouse_email'] = '';
                $payload['spouse_cpf'] = '';
                $payload['spouse_rg'] = '';
                $payload['spouse_nationality'] = '';
            }

            $attachmentIds = [];

            foreach ($files as $file) {
                $path = $this->storeFile($reservation, $file);

                $attachment = $reservation->attachments()->create([
                    'kind' => ReservationAttachmentKind::ContractDocumentation,
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => (string) $file->getMimeType(),
                    'size_bytes' => (int) $file->getSize(),
                    'uploaded_by' => $broker->id,
                ]);

                $attachmentIds[] = $attachment->id;
            }

            if ($proposal !== null) {
                $proposal->update($payload);
            }

            if ($client !== null) {
                $client->update([
                    'email' => $payload['client_email'] !== '' ? $payload['client_email'] : null,
                ]);
            }

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ContractDataSubmitted,
                $broker,
                [
                    'attachment_ids' => $attachmentIds,
                    'client' => $payload,
                ],
            );

            return $reservation->fresh(['unit', 'attachments', 'proposals', 'client']);
        });
    }

    /**
     * @return list<ReservationAttachment>
     */
    public function documentationAttachments(Reservation $reservation): array
    {
        return $reservation->attachments
            ->where('kind', ReservationAttachmentKind::ContractDocumentation)
            ->sortBy('id')
            ->values()
            ->all();
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

    private function validateDocumentationFile(UploadedFile $file): void
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

    private function firstFilled(?string ...$values): string
    {
        foreach ($values as $value) {
            $trimmed = trim((string) $value);

            if ($trimmed !== '') {
                return $trimmed;
            }
        }

        return '';
    }
}
