<?php

/**
 * @see REQ-WIZ-012
 */
use App\Enums\InccIndexSource;
use App\Models\InccIndex;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Http;

it('inserts a new competence from bcb sgs', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.bcb.gov.br/*' => Http::response([
            ['data' => '01/08/2026', 'valor' => '1024.75'],
        ]),
    ]);

    $this->artisan('opim:fetch-incc')
        ->assertSuccessful()
        ->expectsOutputToContain('Inserted INCC-M competence 2026-08-01');

    $index = InccIndex::query()->sole();

    expect($index->competence->toDateString())->toBe('2026-08-01')
        ->and($index->value)->toBe('1024.750000')
        ->and($index->source)->toBe(InccIndexSource::Job)
        ->and($index->fetched_at)->not->toBeNull();
});

it('does not overwrite an existing competence', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.bcb.gov.br/*' => Http::response([
            ['data' => '01/07/2026', 'valor' => '9999.000000'],
        ]),
    ]);

    InccIndex::factory()->manual()->create([
        'competence' => '2026-07-01',
        'value' => '1020.500000',
    ]);

    $this->artisan('opim:fetch-incc')
        ->assertSuccessful()
        ->expectsOutputToContain('already stored');

    $index = InccIndex::query()->sole();

    expect($index->value)->toBe('1020.500000')
        ->and($index->source)->toBe(InccIndexSource::Manual)
        ->and(InccIndex::query()->count())->toBe(1);
});

it('skips persist when the observation looks like monthly variation', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.bcb.gov.br/*' => Http::response([
            ['data' => '01/07/2026', 'valor' => '0.62'],
        ]),
    ]);

    $this->artisan('opim:fetch-incc')
        ->assertSuccessful()
        ->expectsOutputToContain('monthly variation');

    expect(InccIndex::query()->count())->toBe(0);
});

it('exits successfully when bcb sgs is down', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.bcb.gov.br/*' => Http::failedConnection(),
    ]);

    $this->artisan('opim:fetch-incc')
        ->assertSuccessful()
        ->expectsOutputToContain('unavailable');

    expect(InccIndex::query()->count())->toBe(0);
});

it('exits successfully when bcb sgs returns an error status', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.bcb.gov.br/*' => Http::response('unavailable', 503),
    ]);

    $this->artisan('opim:fetch-incc')->assertSuccessful();

    expect(InccIndex::query()->count())->toBe(0);
});

it('schedules fetch-incc daily at 08:05 America/Sao_Paulo', function () {
    $event = collect(app(Schedule::class)->events())->first(
        fn ($event) => str_contains((string) $event->command, 'opim:fetch-incc'),
    );

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('5 8 * * *')
        ->and((string) $event->timezone)->toBe('America/Sao_Paulo');
});
