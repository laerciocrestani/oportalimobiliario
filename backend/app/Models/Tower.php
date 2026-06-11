<?php

namespace App\Models;

use App\Models\Concerns\ComputesUnitsSummary;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\TowerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id',
    'building_id',
    'name',
    'sort_order',
])]
class Tower extends Model
{
    /** @use HasFactory<TowerFactory> */
    use BelongsToTenant, ComputesUnitsSummary, HasFactory;

    protected $attributes = [
        'sort_order' => 0,
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }
}
