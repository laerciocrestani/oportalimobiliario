<?php

namespace App\Models;

use App\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'proposal_signer_user_id'])]
class TenantSignatureSetting extends Model
{
    use BelongsToTenant;

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function proposalSigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'proposal_signer_user_id');
    }

    /** @return HasMany<TenantSignatureWitnessSlot, $this> */
    public function witnessSlots(): HasMany
    {
        return $this->hasMany(TenantSignatureWitnessSlot::class, 'signature_setting_id')
            ->orderBy('position');
    }
}
