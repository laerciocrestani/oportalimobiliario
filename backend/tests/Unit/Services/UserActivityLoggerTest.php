<?php

/**
 * @see REQ-LOG-001
 * @see REQ-LOG-002
 * @see REQ-LOG-005
 * @see REQ-LOG-009
 */
use App\Enums\UserActivityAction;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserActivityEvent;
use App\Services\UserActivityLogger;
use App\Support\BuilderPermissions;

it('records an event for the actor', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();

    app(UserActivityLogger::class)->record(
        action: UserActivityAction::AuthLogin,
        message: 'Entrou no sistema.',
        actor: $user,
        tenantId: $tenant->id,
    );

    $event = UserActivityEvent::query()->sole();

    expect($event->actor_user_id)->toBe($user->id)
        ->and($event->tenant_id)->toBe($tenant->id)
        ->and($event->action)->toBe(UserActivityAction::AuthLogin)
        ->and($event->message)->toBe('Entrou no sistema.')
        ->and($event->impersonator_user_id)->toBeNull()
        ->and($event->impersonated_user_id)->toBeNull();
});

it('allows actor-less events for unknown failed logins', function () {
    app(UserActivityLogger::class)->record(
        action: UserActivityAction::AuthLoginFailed,
        message: 'Tentativa de login falhou para ghost@demo.com.',
        actor: null,
    );

    $event = UserActivityEvent::query()->sole();

    expect($event->actor_user_id)->toBeNull()
        ->and($event->action)->toBe(UserActivityAction::AuthLoginFailed);
});

it('duplicates the event onto the impersonator log', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create(['name' => 'Construtora Alpha']);
    $admin = User::factory()->admin()->create(['name' => 'Admin SaaS']);

    app(UserActivityLogger::class)->record(
        action: UserActivityAction::UnitStatusChanged,
        message: 'Alterou o status da unidade 101 de disponível para reservada.',
        actor: $builder,
        tenantId: $tenant->id,
        resourceType: 'unit',
        resourceId: 101,
        oldValues: ['status' => 'available'],
        newValues: ['status' => 'reserved'],
        impersonatorUserId: $admin->id,
    );

    $events = UserActivityEvent::query()->orderBy('id')->get();

    expect($events)->toHaveCount(2);

    $builderEvent = $events->firstWhere('actor_user_id', $builder->id);
    $adminEvent = $events->firstWhere('actor_user_id', $admin->id);

    expect($builderEvent)->not->toBeNull()
        ->and($builderEvent->impersonator_user_id)->toBe($admin->id)
        ->and($builderEvent->impersonated_user_id)->toBeNull()
        ->and($builderEvent->message)->toContain('impersonado por Admin SaaS')
        ->and($adminEvent)->not->toBeNull()
        ->and($adminEvent->impersonated_user_id)->toBe($builder->id)
        ->and($adminEvent->impersonator_user_id)->toBeNull()
        ->and($adminEvent->message)->toContain('em nome de Construtora Alpha')
        ->and($adminEvent->old_values)->toBe(['status' => 'available'])
        ->and($adminEvent->new_values)->toBe(['status' => 'reserved']);
});

it('rejects updates to activity events', function () {
    $event = UserActivityEvent::factory()->create();

    expect(fn () => $event->update(['message' => 'alterado']))
        ->toThrow(LogicException::class, 'User activity events are append-only.');

    expect($event->fresh()->message)->toBe('Entrou no sistema.');
});

it('rejects deletes of activity events', function () {
    $event = UserActivityEvent::factory()->create();

    expect(fn () => $event->delete())
        ->toThrow(LogicException::class, 'User activity events are append-only.');

    expect(UserActivityEvent::query()->count())->toBe(1);
});

it('includes audit.view in the builder permission catalog', function () {
    expect(BuilderPermissions::all())->toContain(BuilderPermissions::VIEW_AUDIT)
        ->and(BuilderPermissions::labels()[BuilderPermissions::VIEW_AUDIT])->toBe('Auditar atividade da equipe');
});
