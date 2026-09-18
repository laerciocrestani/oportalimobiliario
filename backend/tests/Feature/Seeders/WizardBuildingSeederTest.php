<?php

/**
 * @see REQ-WIZ-017
 * @see REQ-WZR-002
 * @see REQ-WZR-006
 * @see REQ-WZR-011
 */
use App\Enums\CeilingType;
use App\Enums\FloorKind;
use App\Enums\UnitStatus;
use App\Models\Amenity;
use App\Models\Building;
use App\Models\Floor;
use App\Models\InccIndex;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\UnitPriceCalculator;
use App\Tenancy\TenantContext;
use Database\Seeders\AmenitySeeder;
use Database\Seeders\InccIndexSeeder;
use Database\Seeders\TowerSeeder;
use Database\Seeders\UnitSeeder;
use Database\Seeders\WizardBuildingSeeder;

it('creates one published building through structure and unit-grid services', function () {
    Tenant::factory()->create(['slug' => 'construtora-alpha']);
    (new AmenitySeeder)->run();
    (new InccIndexSeeder)->run();
    (new WizardBuildingSeeder)->run();

    expect(TenantContext::has())->toBeFalse();

    $building = Building::query()->where('slug', WizardBuildingSeeder::SLUG)->first();
    $tower = $building?->towers->first();

    expect($building)->not->toBeNull()
        ->and($building->published)->toBeTrue()
        ->and($building->wizard_completed_at)->not->toBeNull()
        ->and($building->wizard_step)->toBe(3)
        ->and($building->zip)->toBe('01310100')
        ->and($building->street)->toBe('Avenida Paulista')
        ->and($building->ceiling_type)->toBe(CeilingType::Plaster)
        ->and($building->towers)->toHaveCount(1)
        ->and($tower?->name)->toBe('Torre A')
        ->and((int) $tower?->floors_count)->toBe(3)
        ->and($tower?->reference_floor)->toBe(1)
        ->and($tower?->tenant_id)->toBe($building->tenant_id)
        ->and($building->amenities->pluck('slug')->sort()->values()->all())->toBe([
            'academia',
            'agua-quente',
            'piscina',
        ]);

    $floors = Floor::query()->where('tower_id', $tower?->id)->orderBy('number')->get();

    expect($floors)->toHaveCount(5)
        ->and($floors->pluck('number')->all())->toBe([-1, 0, 1, 2, 3])
        ->and($floors->firstWhere('number', -1)?->kind)->toBe(FloorKind::Garage)
        ->and($floors->firstWhere('number', 0)?->kind)->toBe(FloorKind::Commercial)
        ->and($floors->firstWhere('number', 1)?->kind)->toBe(FloorKind::Residential)
        ->and((bool) $floors->firstWhere('number', 2)?->customized)->toBeFalse()
        ->and((bool) $floors->firstWhere('number', 3)?->customized)->toBeTrue()
        ->and($building->units)->toHaveCount(10);

    $unit101 = Unit::query()->where('building_id', $building->id)->where('code', '101')->first();
    $unit201 = Unit::query()->where('building_id', $building->id)->where('code', '201')->first();
    $unit301 = Unit::query()->where('building_id', $building->id)->where('code', '301')->first();
    $shop = Unit::query()->where('building_id', $building->id)->where('code', 'L01')->first();
    $spot = Unit::query()->where('building_id', $building->id)->where('code', 'S1-01')->first();

    expect($unit101)->not->toBeNull()
        ->and($unit101->floor_id)->not->toBeNull()
        ->and($unit101->floor)->toBe(1)
        ->and((float) $unit101->price_base)->toBe(480000.0)
        ->and($unit101->price_competence?->toDateString())->toBe(WizardBuildingSeeder::PRICE_COMPETENCE)
        ->and($unit101->bedrooms)->toBe(2)
        ->and($unit101->status)->toBe(UnitStatus::Available)
        ->and($unit201?->floor)->toBe(2)
        ->and((float) $unit201->private_area_m2)->toBe(72.5)
        ->and($unit301?->amenities->pluck('slug')->all())->toBe(['closet'])
        ->and($shop?->floor)->toBe(0)
        ->and((float) $shop->private_area_m2)->toBe(38.0)
        ->and($spot?->floor)->toBe(-1)
        ->and((float) $spot->private_area_m2)->toBe(12.5)
        ->and((float) $spot->price_base)->toBe(45000.0)
        ->and($spot->bedrooms)->toBeNull();

    $calculator = app(UnitPriceCalculator::class);
    $current = InccIndex::query()->orderByDesc('competence')->first();

    expect($current)->not->toBeNull()
        ->and((string) $calculator->decorate($unit101)->getAttribute('price'))->toBe('489840.00');
});

it('does not duplicate the wizard building when the seeder runs twice', function () {
    Tenant::factory()->create(['slug' => 'construtora-alpha']);
    (new AmenitySeeder)->run();
    (new WizardBuildingSeeder)->run();

    $buildingId = Building::query()->where('slug', WizardBuildingSeeder::SLUG)->value('id');
    $unitCount = Unit::query()->where('building_id', $buildingId)->count();
    $completedAt = Building::query()->find($buildingId)?->wizard_completed_at;

    (new WizardBuildingSeeder)->run();
    (new TowerSeeder)->run();
    (new UnitSeeder)->run();

    expect(Building::query()->where('slug', WizardBuildingSeeder::SLUG)->count())->toBe(1)
        ->and(Unit::query()->where('building_id', $buildingId)->count())->toBe($unitCount)
        ->and(Building::query()->find($buildingId)?->wizard_completed_at?->equalTo($completedAt))->toBeTrue()
        ->and(Amenity::query()->count())->toBe(count(AmenitySeeder::definitions()));
});
