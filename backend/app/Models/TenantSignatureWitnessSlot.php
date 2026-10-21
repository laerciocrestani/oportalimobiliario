<?php

namespace App\Models;

use App\Enums\SignatureWitnessKind;
use App\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'signature_setting_id', 'position', 'kind', 'user_id'])]
class TenantSignatureWitnessSlot extends Model
{
    use BelongsToTenant;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => SignatureWitnessKind::class,
            'position' => 'integer',
        ];
    }

    public function setting(): BelongsTo
    {
        return $this->belongsTo(TenantSignatureSetting::class, 'signature_setting_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
