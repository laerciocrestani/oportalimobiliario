<?php

/**
 * @see REQ-RES-002
 * @see REQ-RES-008
 */
use Illuminate\Console\Scheduling\Schedule;

it('registers reservation and deposit schedule commands', function (string $command, string $expression) {
    $event = collect(app(Schedule::class)->events())->first(
        fn ($event) => str_contains((string) $event->command, $command),
    );

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe($expression)
        ->and($event->withoutOverlapping)->toBeTrue();
})->with([
    'expire reservations hourly' => ['opim:expire-reservations', '0 * * * *'],
    'expire pre-reservations every minute' => ['opim:expire-pre-reservations', '* * * * *'],
    'check deposit windows hourly' => ['opim:check-deposit-windows', '0 * * * *'],
]);
