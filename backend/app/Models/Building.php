<?php

namespace App\Models;

use App\Models\Concerns\ComputesUnitsSummary;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\BuildingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id',
    'name',
    'description',
    'city',
    'state',
    'published',
    'seo_title',
    'seo_description',
])]
class Building extends Model
{
    /** @use HasFactory<BuildingFactory> */
    use BelongsToTenant, ComputesUnitsSummary, HasFactory;

    protected function casts(): array
    {
        return [
            'published' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function towers(): HasMany
    {
        return $this->hasMany(Tower::class);
    }

    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }
}
