<?php

/**
 * @see REQ-WZR-002
 * @see REQ-WZR-003
 * @see REQ-WZR-005
 */
use App\Enums\FloorKind;
use App\Models\Building;
use App\Models\Floor;
use App\Models\Tenant;
use App\Models\Tower;
use Illuminate\Database\QueryException;

it('exposes garage as a floor kind', function () {
    expect(FloorKind::Garage->value)->toBe('garage')
        ->and(FloorKind::from('garage'))->toBe(FloorKind::Garage);
});

it('persists ground floor zero and negative garage floors', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();

    $ground = Floor::factory()->for($tenant)->for($tower)->commercial()->create([
        'number' => 0,
    ]);
    $garage = Floor::factory()->for($tenant)->for($tower)->garage()->create([
        'number' => -1,
    ]);

    expect($ground->fresh()->number)->toBe(0)
        ->and($ground->kind)->toBe(FloorKind::Commercial)
        ->and($garage->fresh()->number)->toBe(-1)
        ->and($garage->kind)->toBe(FloorKind::Garage);
});

it('defaults customized to false and stores exception flag', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();

    $floor = Floor::factory()->for($tenant)->for($tower)->create(['number' => 1]);

    expect($floor->customized)->toBeFalse();

    $floor->update(['customized' => true]);

    expect($floor->fresh()->customized)->toBeTrue();
});

it('stores nullable reference floor on the tower', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();

    expect($tower->reference_floor)->toBeNull();

    $tower->update(['reference_floor' => 1]);

    expect($tower->fresh()->reference_floor)->toBe(1);
});

it('keeps unique tower and floor number including zero and negatives', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();
    $tower = Tower::factory()->for($tenant)->for($building)->create();

    Floor::factory()->for($tenant)->for($tower)->create(['number' => 0]);
    Floor::factory()->for($tenant)->for($tower)->garage()->create(['number' => -2]);

    Floor::factory()->for($tenant)->for($tower)->create(['number' => 0]);
})->throws(QueryException::class);
