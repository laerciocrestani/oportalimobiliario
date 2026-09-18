<?php

use App\Support\UnitCode;

it('formats apartment store and garage codes', function (int $floor, int $position, string $expected) {
    expect(UnitCode::fromFloorPosition($floor, $position))->toBe($expected);
})->with([
    'first apartment' => [1, 1, '101'],
    'tenth floor' => [10, 5, '1005'],
    'ground shop' => [0, 1, 'L01'],
    'second shop' => [0, 2, 'L02'],
    'first basement' => [-1, 1, 'S1-01'],
    'second basement stall' => [-2, 3, 'S2-03'],
]);
