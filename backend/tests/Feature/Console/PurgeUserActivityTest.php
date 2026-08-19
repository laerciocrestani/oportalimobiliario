<?php

/**
 * @see REQ-LOG-012
 */
use App\Models\UserActivityEvent;

it('deletes events older than five years and keeps recent ones', function () {
    $this->freezeTime();

    $cutoff = now()->subYears(5);

    $old = UserActivityEvent::factory()->create([
        'created_at' => $cutoff->copy()->subSecond(),
        'message' => 'Evento antigo',
    ]);
    $onCutoff = UserActivityEvent::factory()->create([
        'created_at' => $cutoff,
        'message' => 'Evento no limite',
    ]);
    $recent = UserActivityEvent::factory()->create([
        'created_at' => now()->subDay(),
        'message' => 'Evento recente',
    ]);

    $this->artisan('opim:purge-user-activity')
        ->expectsOutput('Purged 1 user activity event(s).')
        ->assertSuccessful();

    expect(UserActivityEvent::query()->find($old->id))->toBeNull()
        ->and(UserActivityEvent::query()->find($onCutoff->id))->not->toBeNull()
        ->and(UserActivityEvent::query()->find($recent->id))->not->toBeNull();
});
