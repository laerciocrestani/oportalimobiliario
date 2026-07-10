<?php

namespace App\Models;

use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\BrokerTenantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'broker_id',
    'broker_invite_id',
    'tenant_broker_invite_link_id',
    'accepted_at',
    'approved_at',
    'revoked_at',
])]
class BrokerTenant extends Model
{
    /** @use HasFactory<BrokerTenantFactory> */
    use BelongsToTenant, HasFactory;

    protected $table = 'broker_tenants';

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
            'approved_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function broker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'broker_id');
    }

    public function brokerInvite(): BelongsTo
    {
        return $this->belongsTo(BrokerInvite::class);
    }

    public function tenantBrokerInviteLink(): BelongsTo
    {
        return $this->belongsTo(TenantBrokerInviteLink::class);
    }

    public function isApproved(): bool
    {
        return $this->approved_at !== null;
    }

    public function isPendingApproval(): bool
    {
        return $this->approved_at === null;
    }

    public function isActive(): bool
    {
        return $this->isApproved() && $this->revoked_at === null;
    }

    public function isInactive(): bool
    {
        return $this->isApproved() && $this->revoked_at !== null;
    }

    /**
     * @param  Builder<BrokerTenant>  $query
     * @return Builder<BrokerTenant>
     */
    public function scopeApproved(Builder $query): Builder
    {
        return $query->whereNotNull('approved_at');
    }

    /**
     * @param  Builder<BrokerTenant>  $query
     * @return Builder<BrokerTenant>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotNull('approved_at')->whereNull('revoked_at');
    }

    /**
     * @param  Builder<BrokerTenant>  $query
     * @return Builder<BrokerTenant>
     */
    public function scopeInactive(Builder $query): Builder
    {
        return $query->whereNotNull('approved_at')->whereNotNull('revoked_at');
    }

    /**
     * @param  Builder<BrokerTenant>  $query
     * @return Builder<BrokerTenant>
     */
    public function scopePendingApproval(Builder $query): Builder
    {
        return $query->whereNull('approved_at');
    }
}
