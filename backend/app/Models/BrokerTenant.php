<?php

namespace App\Models;

use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\BrokerTenantFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'broker_id',
    'broker_invite_id',
    'accepted_at',
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
}
