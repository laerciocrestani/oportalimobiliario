<?php

namespace App\Models;

use App\Enums\ReservationAttachmentKind;
use Database\Factories\ReservationAttachmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'reservation_id',
    'kind',
    'path',
    'original_name',
    'mime_type',
    'size_bytes',
    'uploaded_by',
])]
class ReservationAttachment extends Model
{
    /** @use HasFactory<ReservationAttachmentFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'kind' => ReservationAttachmentKind::class,
            'size_bytes' => 'integer',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(string $filePathPrefix): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind->value,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'uploaded_by' => $this->uploaded_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'file_url' => "{$filePathPrefix}/{$this->id}/file",
        ];
    }
}
