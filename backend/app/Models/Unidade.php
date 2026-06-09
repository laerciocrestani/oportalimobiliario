<?php

namespace App\Models;

use App\Enums\UnidadeStatus;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\UnidadeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'tenant_id',
    'empreendimento_id',
    'codigo',
    'andar',
    'area_m2',
    'preco',
    'status',
])]
class Unidade extends Model
{
    /** @use HasFactory<UnidadeFactory> */
    use BelongsToTenant, HasFactory;

    protected $attributes = [
        'status' => 'disponivel',
    ];

    protected function casts(): array
    {
        return [
            'status' => UnidadeStatus::class,
            'area_m2' => 'decimal:2',
            'preco' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function empreendimento(): BelongsTo
    {
        return $this->belongsTo(Empreendimento::class);
    }

    public function reserva(): HasOne
    {
        return $this->hasOne(Reserva::class);
    }

    public function acessos(): HasMany
    {
        return $this->hasMany(AcessoUnidade::class);
    }
}
