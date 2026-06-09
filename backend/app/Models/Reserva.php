<?php

namespace App\Models;

use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\ReservaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'unidade_id',
    'corretor_id',
    'expires_at',
])]
class Reserva extends Model
{
    /** @use HasFactory<ReservaFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function unidade(): BelongsTo
    {
        return $this->belongsTo(Unidade::class);
    }

    public function corretor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corretor_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
