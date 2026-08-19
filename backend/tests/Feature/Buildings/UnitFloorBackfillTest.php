<?php

/**
 * @see REQ-WIZ-005
 */
use App\Enums\FloorKind;
use App\Models\Building;
use App\Models\Floor;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\Unit;
use App\Services\UnitFloorBackfill;

it('creates missing floors from unit floor numbers', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create(['floors_count' => 0]);

    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'tower_id' => $tower->id,
        'floor' => 3,
        'floor_id' => null,
        'code' => '301',
    ]);

    $updated = app(UnitFloorBackfill::class)->run();

    expect($updated)->toBe(1)
        ->and($unit->fresh()->floor_id)->not->toBeNull();

    $floor = Floor::query()->where('tower_id', $tower->id)->where('number', 3)->first();

    expect($floor)->not->toBeNull()
        ->and($floor->kind)->toBe(FloorKind::Residential)
        ->and($unit->fresh()->floor_id)->toBe($floor->id)
        ->and($tower->fresh()->floors_count)->toBe(1);
});

it('is a no-op when floor_id is already set', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();
    $floor = Floor::factory()->for($tenant)->for($tower)->create(['number' => 2]);

    Unit::factory()->for($tenant)->for($building)->create([
        'tower_id' => $tower->id,
        'floor' => 2,
        'floor_id' => $floor->id,
        'code' => '201',
    ]);

    expect(app(UnitFloorBackfill::class)->run())->toBe(0);
});
