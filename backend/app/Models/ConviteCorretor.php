<?php

namespace App\Models;

use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\ConviteCorretorFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'created_by',
    'email',
    'token',
    'corretor_id',
    'accepted_at',
    'expires_at',
])]
class ConviteCorretor extends Model
{
    /** @use HasFactory<ConviteCorretorFactory> */
    use BelongsToTenant, HasFactory;

    protected $table = 'convites_corretor';

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function corretor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corretor_id');
    }

    public function isPending(): bool
    {
        return $this->accepted_at === null && $this->expires_at->isFuture();
    }
}
