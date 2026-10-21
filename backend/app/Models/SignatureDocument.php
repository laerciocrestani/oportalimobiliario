<?php

namespace App\Models;

use App\Enums\SignatureDocumentKind;
use App\Enums\SignatureDocumentStatus;
use App\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id',
    'reservation_id',
    'kind',
    'reference',
    'provider_document_id',
    'status',
    'error',
])]
class SignatureDocument extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return [
            'kind' => SignatureDocumentKind::class,
            'status' => SignatureDocumentStatus::class,
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /** @return HasMany<SignatureSigner, $this> */
    public function signers(): HasMany
    {
        return $this->hasMany(SignatureSigner::class);
    }
}
