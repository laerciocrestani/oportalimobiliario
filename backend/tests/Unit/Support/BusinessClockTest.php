<?php

use App\Models\NationalHoliday;
use App\Support\BrazilianNationalHolidays;
use App\Support\BusinessClock;
use Carbon\CarbonImmutable;

it('adds forty eight business hours from friday afternoon to tuesday afternoon', function () {
    $deadline = (new BusinessClock)->addHours(
        CarbonImmutable::parse('2026-10-02 16:00:00', BusinessClock::TIMEZONE),
        48,
        [],
    );

    expect($deadline->timezone(BusinessClock::TIMEZONE)->toDateTimeString())
        ->toBe('2026-10-06 16:00:00');
});

it('does not consume saturday or sunday', function () {
    $deadline = (new BusinessClock)->addHours(
        CarbonImmutable::parse('2026-10-03 10:00:00', BusinessClock::TIMEZONE),
        48,
        [],
    );

    expect($deadline->timezone(BusinessClock::TIMEZONE)->toDateTimeString())
        ->toBe('2026-10-07 00:00:00');
});

it('skips a national holiday and the weekend that follows it', function () {
    $deadline = (new BusinessClock)->addHours(
        CarbonImmutable::parse('2026-04-02 16:00:00', BusinessClock::TIMEZONE),
        9,
        ['2026-04-03'],
    );

    expect($deadline->timezone(BusinessClock::TIMEZONE)->toDateTimeString())
        ->toBe('2026-04-06 01:00:00');
});

it('keeps the seconds when the start is not on an exact minute', function () {
    $deadline = (new BusinessClock)->addHours(
        CarbonImmutable::parse('2026-10-06 10:39:53', BusinessClock::TIMEZONE),
        48,
        [],
    );

    expect($deadline->timezone(BusinessClock::TIMEZONE)->toDateTimeString())
        ->toBe('2026-10-08 10:39:53');
});

it('adds extension hours on top of an existing business deadline', function () {
    $deadline = (new BusinessClock)->addHours(
        CarbonImmutable::parse('2026-10-06 16:00:00', BusinessClock::TIMEZONE),
        10,
        [],
    );

    expect($deadline->timezone(BusinessClock::TIMEZONE)->toDateTimeString())
        ->toBe('2026-10-07 02:00:00');
});

it('stores brazilian national holidays without carnival', function () {
    expect(BrazilianNationalHolidays::forYear(2026))
        ->toHaveKey('2026-04-03', 'Sexta-feira Santa')
        ->toHaveKey('2026-01-01')
        ->not->toHaveKey('2026-02-16')
        ->not->toHaveKey('2026-02-17');

    expect(NationalHoliday::query()->whereDate('date', '2026-04-03')->exists())->toBeTrue()
        ->and(NationalHoliday::query()->whereDate('date', '2026-02-16')->exists())->toBeFalse();
});
