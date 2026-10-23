<?php

namespace App\Models;

use App\Enums\SignatureSignerRole;
use App\Enums\SignatureSignerStatus;
use App\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'signature_document_id',
    'role',
    'signer_key',
    'name',
    'phone',
    'email',
    'status',
    'provider_signer_id',
    'sign_url',
    'last_notified_at',
])]
class SignatureSigner extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return [
            'role' => SignatureSignerRole::class,
            'status' => SignatureSignerStatus::class,
            'last_notified_at' => 'datetime',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(SignatureDocument::class, 'signature_document_id');
    }
}
