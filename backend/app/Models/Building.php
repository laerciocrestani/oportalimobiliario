<?php

namespace App\Models;

use App\Enums\BuildingMediaCategory;
use App\Enums\CeilingType;
use App\Enums\FlooringType;
use App\Enums\OpeningType;
use App\Enums\SolarPosition;
use App\Enums\SunPeriod;
use App\Enums\UnitStatus;
use App\Models\Concerns\ComputesUnitsSummary;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\BuildingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'tenant_id',
    'name',
    'slug',
    'zip',
    'street',
    'number',
    'complement',
    'neighborhood',
    'description',
    'city',
    'state',
    'ceiling_type',
    'opening_type',
    'flooring_type',
    'solar_position',
    'sun_period',
    'published',
    'wizard_step',
    'wizard_completed_at',
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
            'wizard_step' => 'integer',
            'wizard_completed_at' => 'datetime',
            'ceiling_type' => CeilingType::class,
            'opening_type' => OpeningType::class,
            'flooring_type' => FlooringType::class,
            'solar_position' => SolarPosition::class,
            'sun_period' => SunPeriod::class,
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

    public function media(): HasMany
    {
        return $this->hasMany(BuildingMedia::class);
    }

    public function cheapestAvailableUnit(): HasOne
    {
        return $this->hasOne(Unit::class)->ofMany(
            ['price' => 'min'],
            fn (Builder $query) => $query
                ->where('status', UnitStatus::Available)
                ->whereNotNull('price'),
        );
    }

    public function publicCoverMedia(): HasOne
    {
        return $this->hasOne(BuildingMedia::class)->ofMany(
            ['sort_order' => 'min', 'id' => 'min'],
            fn (Builder $query) => $query
                ->where('published', true)
                ->whereIn('category', BuildingMediaCategory::publicCategories())
                ->where('mime_type', 'like', 'image/%'),
        );
    }

    public function coverMedia(): HasOne
    {
        return $this->hasOne(BuildingMedia::class)->ofMany(
            ['sort_order' => 'min', 'id' => 'min'],
            fn (Builder $query) => $query->where('mime_type', 'like', 'image/%'),
        );
    }
}
