<?php

namespace App\Models;

use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\BuildingAccessFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id',
    'broker_id',
    'building_id',
])]
class BuildingAccess extends Model
{
    /** @use HasFactory<BuildingAccessFactory> */
    use BelongsToTenant, HasFactory;

    protected $table = 'building_access';

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function broker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'broker_id');
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }
}
