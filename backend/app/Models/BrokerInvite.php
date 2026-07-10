<?php

namespace App\Models;

use App\Enums\BrokerInviteChannel;
use App\Enums\BrokerInviteDeliveryStatus;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\BrokerInviteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'created_by',
    'name',
    'email',
    'phone',
    'channel',
    'token',
    'broker_id',
    'accepted_at',
    'declined_at',
    'revoked_at',
    'expires_at',
    'last_sent_at',
    'whatsapp_message_id',
    'delivery_status',
    'delivery_error',
])]
class BrokerInvite extends Model
{
    /** @use HasFactory<BrokerInviteFactory> */
    use BelongsToTenant, HasFactory;

    protected $table = 'broker_invites';

    protected function casts(): array
    {
        return [
            'channel' => BrokerInviteChannel::class,
            'delivery_status' => BrokerInviteDeliveryStatus::class,
            'accepted_at' => 'datetime',
            'declined_at' => 'datetime',
            'revoked_at' => 'datetime',
            'expires_at' => 'datetime',
            'last_sent_at' => 'datetime',
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

    public function broker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'broker_id');
    }

    public function isPending(): bool
    {
        return $this->accepted_at === null && $this->expires_at->isFuture();
    }

    /**
     * @param  Builder<BrokerInvite>  $query
     * @return Builder<BrokerInvite>
     */
    public function scopeOpen(Builder $query): Builder
    {
        return $query
            ->whereNull('accepted_at')
            ->whereNull('declined_at')
            ->whereNull('revoked_at');
    }
}
