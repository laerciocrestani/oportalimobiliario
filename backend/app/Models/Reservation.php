<?php

namespace App\Models;

use App\Enums\ReservationStatus;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\ReservationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id',
    'unit_id',
    'broker_id',
    'client_id',
    'status',
    'expires_at',
])]
class Reservation extends Model
{
    /** @use HasFactory<ReservationFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'status' => ReservationStatus::class,
            'expires_at' => 'datetime',
        ];
    }

    /** @param Builder<Reservation> $query */
    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', ReservationStatus::Confirmed);
    }

    public function isPreHold(): bool
    {
        return $this->status === ReservationStatus::PreHold;
    }

    public function isConfirmed(): bool
    {
        return $this->status === ReservationStatus::Confirmed;
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function broker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'broker_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(BrokerClient::class, 'client_id');
    }

    /** @return HasMany<ReservationMessage, $this> */
    public function messages(): HasMany
    {
        return $this->hasMany(ReservationMessage::class);
    }

    /** @return HasMany<ReservationTimelineEvent, $this> */
    public function timelineEvents(): HasMany
    {
        return $this->hasMany(ReservationTimelineEvent::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
