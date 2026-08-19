<?php

/**
 * @see REQ-WIZ-011
 */
use App\Models\InccIndex;
use App\Models\Unit;
use App\Services\UnitPriceCalculator;

it('raises the display price when the current index is above the competence', function () {
    InccIndex::factory()->create(['competence' => '2026-02-01', 'value' => '1000.000000']);
    InccIndex::factory()->create(['competence' => '2026-07-01', 'value' => '1020.500000']);

    $unit = Unit::factory()->create([
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
    ]);

    $resolved = (new UnitPriceCalculator)->resolve($unit);

    expect($resolved['price'])->toBe('102050.00')
        ->and($resolved['price_incc_current'])->toBe('1020.500000');
});

it('lowers the display price when the current index is below the competence', function () {
    InccIndex::factory()->create(['competence' => '2026-02-01', 'value' => '1000.000000']);
    InccIndex::factory()->create(['competence' => '2026-07-01', 'value' => '800.000000']);

    $unit = Unit::factory()->create([
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
    ]);

    expect((new UnitPriceCalculator)->resolve($unit)['price'])->toBe('80000.00');
});

it('returns null price when there is no current index', function () {
    $unit = Unit::factory()->create([
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
    ]);

    $resolved = (new UnitPriceCalculator)->resolve($unit);

    expect($resolved['price'])->toBeNull()
        ->and($resolved['price_incc_current'])->toBeNull();
});

it('returns null price when the competence month has no index', function () {
    InccIndex::factory()->create(['competence' => '2026-07-01', 'value' => '1020.500000']);

    $unit = Unit::factory()->create([
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
    ]);

    $resolved = (new UnitPriceCalculator)->resolve($unit);

    expect($resolved['price'])->toBeNull()
        ->and($resolved['price_incc_current'])->toBe('1020.500000');
});

it('uses frozen_price_brl instead of the INCC formula', function () {
    InccIndex::factory()->create(['competence' => '2026-02-01', 'value' => '1000.000000']);
    InccIndex::factory()->create(['competence' => '2026-07-01', 'value' => '1020.500000']);

    $unit = Unit::factory()->create([
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
        'frozen_price_brl' => 555000,
    ]);

    $resolved = (new UnitPriceCalculator)->resolve($unit);

    expect($resolved['price'])->toBe('555000.00')
        ->and($resolved['price_incc_current'])->toBe('1020.500000');
});

it('overwrites the price attribute on decorate without persisting', function () {
    InccIndex::factory()->create(['competence' => '2026-02-01', 'value' => '1000.000000']);
    InccIndex::factory()->create(['competence' => '2026-07-01', 'value' => '1020.500000']);

    $unit = Unit::factory()->create([
        'price' => 100000,
        'price_base' => 100000,
        'price_competence' => '2026-02-01',
    ]);

    (new UnitPriceCalculator)->decorate($unit);

    expect($unit->price)->toBe('102050.00')
        ->and($unit->price_incc_current)->toBe('1020.500000');

    expect($unit->fresh()->price)->toBe('100000.00');
});
