<?php

/**
 * @see REQ-WIZ-017
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

    expect($building)->not->toBeNull()
        ->and($building->published)->toBeTrue()
        ->and($building->wizard_completed_at)->not->toBeNull()
        ->and($building->wizard_step)->toBe(4)
        ->and($building->zip)->toBe('01310100')
        ->and($building->street)->toBe('Avenida Paulista')
        ->and($building->ceiling_type)->toBe(CeilingType::Plaster)
        ->and($building->towers)->toHaveCount(1)
        ->and($building->towers->first()?->name)->toBe('Torre A')
        ->and((int) $building->towers->first()?->floors_count)->toBe(3)
        ->and($building->towers->first()?->tenant_id)->toBe($building->tenant_id)
        ->and($building->amenities->pluck('slug')->sort()->values()->all())->toBe([
            'academia',
            'agua-quente',
            'piscina',
        ]);

    expect(Floor::query()->where('tower_id', $building->towers->first()?->id)->count())->toBe(3)
        ->and(Floor::query()->where('kind', FloorKind::Commercial)->count())->toBe(1)
        ->and($building->units)->toHaveCount(5);

    $unit101 = Unit::query()->where('building_id', $building->id)->where('code', '101')->first();
    $unit301 = Unit::query()->where('building_id', $building->id)->where('code', '301')->first();

    expect($unit101)->not->toBeNull()
        ->and($unit101->floor_id)->not->toBeNull()
        ->and((float) $unit101->price_base)->toBe(480000.0)
        ->and($unit101->price_competence?->toDateString())->toBe(WizardBuildingSeeder::PRICE_COMPETENCE)
        ->and($unit101->bedrooms)->toBe(2)
        ->and($unit101->status)->toBe(UnitStatus::Available)
        ->and($unit301?->amenities->pluck('slug')->all())->toBe(['closet']);

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
