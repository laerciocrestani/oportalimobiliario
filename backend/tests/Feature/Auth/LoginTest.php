<?php

/**
 * @see REQ-AUTH-001
 * @see REQ-AUTH-004
 * @see REQ-LOG-004
 */
use App\Enums\UserActivityAction;
use App\Models\User;
use App\Models\UserActivityEvent;
use Laravel\Sanctum\Sanctum;

it('logs in with valid credentials', function () {
    $user = User::factory()->builder()->create([
        'email' => 'login@demo.com',
        'password' => 'password',
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'login@demo.com',
        'password' => 'password',
    ]);

    $response
        ->assertOk()
        ->assertJsonStructure(['token', 'user' => ['id', 'email', 'role']])
        ->assertJsonPath('user.email', $user->email);
});

it('rejects invalid credentials', function () {
    User::factory()->create(['email' => 'login@demo.com']);

    $this->postJson('/api/auth/login', [
        'email' => 'login@demo.com',
        'password' => 'wrong-password',
    ])->assertUnprocessable();
});

it('returns authenticated user on me endpoint', function () {
    $user = User::factory()->admin()->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('email', $user->email);
});

it('requires authentication for me endpoint', function () {
    $this->getJson('/api/auth/me')->assertUnauthorized();
});

it('logs out and revokes current token', function () {
    $user = User::factory()->builder()->create();

    $token = $user->createToken('api')->plainTextToken;

    expect($user->tokens()->count())->toBe(1);

    $this->withToken($token)
        ->postJson('/api/auth/logout')
        ->assertOk()
        ->assertJsonPath('message', 'Logged out');

    expect($user->fresh()->tokens()->count())->toBe(0)
        ->and(UserActivityEvent::query()->where('actor_user_id', $user->id)->where('action', UserActivityAction::AuthLogout)->count())->toBe(1);
});

it('records a login event for the authenticated user', function () {
    $user = User::factory()->builder()->create([
        'email' => 'login-log@demo.com',
        'password' => 'password',
    ]);

    $this->postJson('/api/auth/login', [
        'email' => 'login-log@demo.com',
        'password' => 'password',
    ])->assertOk();

    $event = UserActivityEvent::query()->where('actor_user_id', $user->id)->sole();

    expect($event->action)->toBe(UserActivityAction::AuthLogin)
        ->and($event->message)->toBe('Entrou no sistema.')
        ->and($event->tenant_id)->toBe($user->tenant_id);
});

it('records a failed login on the matched user', function () {
    $user = User::factory()->create(['email' => 'login-fail@demo.com']);

    $this->postJson('/api/auth/login', [
        'email' => 'login-fail@demo.com',
        'password' => 'wrong-password',
    ])->assertUnprocessable();

    $event = UserActivityEvent::query()->sole();

    expect($event->actor_user_id)->toBe($user->id)
        ->and($event->action)->toBe(UserActivityAction::AuthLoginFailed)
        ->and($event->message)->toContain('login-fail@demo.com');
});

it('records a failed login without actor when the identifier is unknown', function () {
    $this->postJson('/api/auth/login', [
        'email' => 'ghost@demo.com',
        'password' => 'password',
    ])->assertUnprocessable();

    $event = UserActivityEvent::query()->sole();

    expect($event->actor_user_id)->toBeNull()
        ->and($event->action)->toBe(UserActivityAction::AuthLoginFailed)
        ->and($event->message)->toContain('ghost@demo.com');
});
