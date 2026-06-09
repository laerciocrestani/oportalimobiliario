<?php

namespace App\Models;

use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\AcessoUnidadeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'corretor_id',
    'unidade_id',
])]
class AcessoUnidade extends Model
{
    /** @use HasFactory<AcessoUnidadeFactory> */
    use BelongsToTenant, HasFactory;

    protected $table = 'acessos_unidades';

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function corretor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corretor_id');
    }

    public function unidade(): BelongsTo
    {
        return $this->belongsTo(Unidade::class);
    }
}
