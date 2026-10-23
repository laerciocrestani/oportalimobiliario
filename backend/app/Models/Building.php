<?php

namespace App\Models;

use App\Enums\BuildingMediaCategory;
use App\Enums\BuildingCategory;
use App\Enums\CeilingType;
use App\Enums\FlooringType;
use App\Enums\OpeningType;
use App\Enums\PriceMode;
use App\Enums\SolarPosition;
use App\Enums\SunPeriod;
use App\Enums\UnitStatus;
use App\Models\Concerns\ComputesUnitsSummary;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\BuildingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'tenant_id',
    'name',
    'category',
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
    'price_mode',
    'wizard_step',
    'wizard_completed_at',
    'seo_title',
    'seo_description',
])]
class Building extends Model
{
    /** @use HasFactory<BuildingFactory> */
    use BelongsToTenant, ComputesUnitsSummary, HasFactory, HasUuids;

    protected $attributes = [
        'category' => 'residential',
        'price_mode' => 'incc',
    ];

    protected function casts(): array
    {
        return [
            'published' => 'boolean',
            'category' => BuildingCategory::class,
            'price_mode' => PriceMode::class,
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

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'building_amenity');
    }

    public function media(): HasMany
    {
        return $this->hasMany(BuildingMedia::class);
    }

    /**
     * Unidade disponível de menor preço.
     *
     * Não usa ofMany(): o desempate agrega MAX(id) e o PostgreSQL não tem max(uuid).
     */
    public function cheapestAvailableUnit(): HasOne
    {
        $table = (new Unit)->getTable();

        return $this->hasOne(Unit::class)
            ->where("{$table}.status", UnitStatus::Available)
            ->whereNotNull("{$table}.price")
            ->whereRaw(
                "{$table}.id = (
                    select cheapest.id
                    from {$table} as cheapest
                    where cheapest.building_id = {$table}.building_id
                      and cheapest.status = ?
                      and cheapest.price is not null
                    order by cheapest.price asc, cheapest.id asc
                    limit 1
                )",
                [UnitStatus::Available->value],
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
