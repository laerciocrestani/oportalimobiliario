<?php

namespace App\Models;

use App\Enums\CeilingType;
use App\Enums\FlooringType;
use App\Enums\OpeningType;
use App\Enums\PropertyPosition;
use App\Enums\SolarPosition;
use App\Enums\SunPeriod;
use App\Enums\UnitStatus;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\UnitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'tenant_id',
    'building_id',
    'tower_id',
    'floor_id',
    'code',
    'floor',
    'area_m2',
    'private_area_m2',
    'total_area_m2',
    'bedrooms',
    'bathrooms',
    'suites',
    'powder_rooms',
    'balconies',
    'solar_position',
    'sun_period',
    'property_position',
    'ceiling_type',
    'opening_type',
    'flooring_type',
    'price',
    'price_base',
    'price_competence',
    'frozen_price_brl',
    'status',
])]
class Unit extends Model
{
    /** @use HasFactory<UnitFactory> */
    use BelongsToTenant, HasFactory;

    protected $attributes = [
        'status' => 'available',
    ];

    protected function casts(): array
    {
        return [
            'status' => UnitStatus::class,
            'area_m2' => 'decimal:2',
            'private_area_m2' => 'decimal:2',
            'total_area_m2' => 'decimal:2',
            'bedrooms' => 'integer',
            'bathrooms' => 'integer',
            'suites' => 'integer',
            'powder_rooms' => 'integer',
            'balconies' => 'integer',
            'solar_position' => SolarPosition::class,
            'sun_period' => SunPeriod::class,
            'property_position' => PropertyPosition::class,
            'ceiling_type' => CeilingType::class,
            'opening_type' => OpeningType::class,
            'flooring_type' => FlooringType::class,
            'price' => 'decimal:2',
            'price_base' => 'decimal:2',
            'price_competence' => 'date',
            'frozen_price_brl' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function tower(): BelongsTo
    {
        return $this->belongsTo(Tower::class);
    }

    public function floorRecord(): BelongsTo
    {
        return $this->belongsTo(Floor::class, 'floor_id');
    }

    public function reservation(): HasOne
    {
        return $this->hasOne(Reservation::class);
    }

    public function unitAccess(): HasMany
    {
        return $this->hasMany(UnitAccess::class);
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'unit_amenity');
    }
}
