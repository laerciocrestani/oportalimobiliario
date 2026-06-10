<?php

namespace App\Models;

use App\Enums\UnitStatus;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\UnitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'tenant_id',
    'building_id',
    'code',
    'floor',
    'area_m2',
    'price',
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
            'price' => 'decimal:2',
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

    public function reservation(): HasOne
    {
        return $this->hasOne(Reservation::class);
    }

    public function unitAccess(): HasMany
    {
        return $this->hasMany(UnitAccess::class);
    }
}
