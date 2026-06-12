<?php

namespace App\Models;

use Database\Factories\BrokerClientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'broker_id',
    'name',
    'phone',
    'email',
])]
class BrokerClient extends Model
{
    /** @use HasFactory<BrokerClientFactory> */
    use HasFactory;

    public function broker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'broker_id');
    }

    /** @return HasMany<Reservation, $this> */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'client_id');
    }
}
