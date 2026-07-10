<?php

namespace App\Models;

use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\TenantBrokerInviteLinkFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'created_by',
    'token',
    'regenerated_at',
])]
class TenantBrokerInviteLink extends Model
{
    /** @use HasFactory<TenantBrokerInviteLinkFactory> */
    use BelongsToTenant, HasFactory;

    protected $table = 'tenant_broker_invite_links';

    protected function casts(): array
    {
        return [
            'regenerated_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
