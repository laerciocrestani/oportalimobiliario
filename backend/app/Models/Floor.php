<?php

namespace App\Models;

use App\Enums\FloorKind;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\FloorFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id',
    'tower_id',
    'number',
    'kind',
])]
class Floor extends Model
{
    /** @use HasFactory<FloorFactory> */
    use BelongsToTenant, HasFactory;

    protected $attributes = [
        'kind' => 'residential',
    ];

    protected function casts(): array
    {
        return [
            'kind' => FloorKind::class,
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function tower(): BelongsTo
    {
        return $this->belongsTo(Tower::class);
    }

    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }
}
