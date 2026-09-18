<?php

namespace App\Models;

use Database\Factories\ReservationWitnessFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'reservation_id',
    'user_id',
    'slot',
    'signed_at',
])]
class ReservationWitness extends Model
{
    /** @use HasFactory<ReservationWitnessFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'slot' => 'integer',
            'signed_at' => 'datetime',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hasSigned(): bool
    {
        return $this->signed_at !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(User $viewer): array
    {
        $this->loadMissing('user:id,name');

        return [
            'slot' => $this->slot,
            'signed_at' => $this->signed_at?->toIso8601String(),
            'is_current_user' => (int) $this->user_id === (int) $viewer->id,
            'user' => $this->user === null ? null : [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ],
        ];
    }
}
