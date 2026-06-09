<?php

namespace App\Models;

use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\EmpreendimentoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id',
    'nome',
    'descricao',
    'cidade',
    'estado',
    'publicado',
    'seo_title',
    'seo_description',
])]
class Empreendimento extends Model
{
    /** @use HasFactory<EmpreendimentoFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'publicado' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function unidades(): HasMany
    {
        return $this->hasMany(Unidade::class);
    }
}
