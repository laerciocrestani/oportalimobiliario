<?php

/**
 * @see REQ-AUTH-001
 * @see REQ-AUTH-004
 */
use App\Models\User;
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

    expect($user->fresh()->tokens()->count())->toBe(0);
});
