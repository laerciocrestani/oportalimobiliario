<?php

/**
 * @see REQ-CONV-001
 * @see REQ-CONV-002
 * @see REQ-CONV-004
 * @see REQ-CONV-006
 * @see REQ-CONV-008
 * @see REQ-CONV-009
 */
use App\Mail\BrokerInviteMail;
use App\Models\BrokerInvite;
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\BuildingMedia;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

it('creates invite as builder and sends email', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', [
        'name' => 'Novo Corretor',
        'channel' => 'email',
        'email' => 'novo@broker.com',
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'Novo Corretor')
        ->assertJsonPath('email', 'novo@broker.com')
        ->assertJsonPath('channel', 'email')
        ->assertJsonPath('status', 'pending')
        ->assertJsonStructure(['invite_url', 'last_sent_at']);

    Mail::assertSent(BrokerInviteMail::class);
});

it('rejects duplicate email invite while one is open', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'email' => 'duplicado@broker.com',
    ]);

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', [
        'name' => 'Outro Nome',
        'channel' => 'email',
        'email' => 'duplicado@broker.com',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);

    Mail::assertNothingSent();
});

it('rejects duplicate whatsapp invite while one is open', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    BrokerInvite::factory()->whatsapp()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'phone' => '+5511988776655',
    ]);

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', [
        'name' => 'Outro Corretor',
        'channel' => 'whatsapp',
        'phone' => '(11) 98877-6655',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['phone']);

    Mail::assertNothingSent();
});

it('allows new invite after previous one was revoked', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'email' => 'revogado@broker.com',
        'revoked_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', [
        'name' => 'Novo Corretor',
        'channel' => 'email',
        'email' => 'revogado@broker.com',
    ])
        ->assertCreated()
        ->assertJsonPath('email', 'revogado@broker.com');

    Mail::assertSent(BrokerInviteMail::class);
});

it('rejects invite when broker is already linked to tenant', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create(['email' => 'vinculado@broker.com']);

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', [
        'name' => 'Corretor Vinculado',
        'channel' => 'email',
        'email' => 'vinculado@broker.com',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);

    Mail::assertNothingSent();
});

it('creates invite and sends whatsapp template', function () {
    Mail::fake();
    Http::fake([
        'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.test123']]], 200),
    ]);

    config([
        'services.whatsapp.access_token' => 'test-token',
        'services.whatsapp.phone_number_id' => '123456789',
    ]);

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', [
        'name' => 'Corretor WhatsApp',
        'channel' => 'whatsapp',
        'phone' => '(11) 99999-9999',
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'Corretor WhatsApp')
        ->assertJsonPath('phone', '+5511999999999')
        ->assertJsonPath('channel', 'whatsapp')
        ->assertJsonPath('delivery_status', 'sent');

    Http::assertSent(fn ($request) => str_contains($request->url(), 'graph.facebook.com')
        && $request['type'] === 'template'
        && collect($request['template']['components'] ?? [])->contains(
            fn (array $component): bool => ($component['type'] ?? null) === 'button'
                && ($component['sub_type'] ?? null) === 'url',
        ));

    Mail::assertNothingSent();
});

it('lists invites with status', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'email' => 'pendente@demo.com',
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/invites')
        ->assertOk()
        ->assertJsonFragment(['email' => 'pendente@demo.com', 'status' => 'pending']);
});

it('previews invite without authentication', function () {
    $tenant = Tenant::factory()->create(['name' => 'Alpha Corp']);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'preview@demo.com',
    ]);

    $this->getJson('/api/broker/invites/preview?token='.$invite->token)
        ->assertOk()
        ->assertJsonPath('name', $invite->name)
        ->assertJsonPath('email', 'preview@demo.com')
        ->assertJsonPath('requires_email', false)
        ->assertJsonPath('tenant_name', 'Alpha Corp')
        ->assertJsonPath('status', 'pending');
});

it('previews whatsapp invite requiring email on accept', function () {
    $tenant = Tenant::factory()->create(['name' => 'Alpha Corp']);
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    $invite = BrokerInvite::factory()->whatsapp()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'name' => 'Corretor WA',
    ]);

    $this->getJson('/api/broker/invites/preview?token='.$invite->token)
        ->assertOk()
        ->assertJsonPath('name', 'Corretor WA')
        ->assertJsonPath('email', null)
        ->assertJsonPath('requires_email', true);
});

it('accepts whatsapp invite with email provided at accept', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    $invite = BrokerInvite::factory()->whatsapp()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'name' => 'Corretor WhatsApp',
    ]);

    $this->postJson('/api/broker/invites/accept', [
        'token' => $invite->token,
        'email' => 'whatsapp.corretor@demo.com',
        'password' => 'password123',
    ])
        ->assertOk()
        ->assertJsonStructure(['token', 'user']);

    $broker = User::query()->where('email', 'whatsapp.corretor@demo.com')->first();

    expect($broker)->not->toBeNull()
        ->and($broker->name)->toBe('Corretor WhatsApp')
        ->and($broker->role)->toBe('broker');

    expect($invite->fresh()->email)->toBe('whatsapp.corretor@demo.com');
});

it('accepts invite and creates broker account', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'novo.corretor@demo.com',
    ]);

    $this->postJson('/api/broker/invites/accept', [
        'token' => $invite->token,
        'name' => 'Novo Corretor',
        'password' => 'password123',
    ])
        ->assertOk()
        ->assertJsonStructure(['token', 'user']);

    $broker = User::query()->where('email', 'novo.corretor@demo.com')->first();

    expect($broker)->not->toBeNull()
        ->and($broker->role)->toBe('broker');

    expect(BrokerTenant::query()->where('tenant_id', $tenant->id)->where('broker_id', $broker->id)->exists())->toBeTrue();
});

it('accepting individual invite approves pending open link registration', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create(['email' => 'novo.corretor@demo.com']);

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'novo.corretor@demo.com',
    ]);

    $tenantLink = BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'approved_at' => null,
    ]);

    $this->postJson('/api/broker/invites/accept', [
        'token' => $invite->token,
    ])
        ->assertOk()
        ->assertJsonPath('user.id', $broker->id);

    expect($tenantLink->fresh()->approved_at)->not->toBeNull()
        ->and($tenantLink->fresh()->broker_invite_id)->toBe($invite->id)
        ->and($invite->fresh()->accepted_at)->not->toBeNull();
});

it('accepts invite for existing broker', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create(['email' => 'aceite@demo.com']);

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'aceite@demo.com',
    ]);

    $this->postJson('/api/broker/invites/accept', ['token' => $invite->token])
        ->assertOk()
        ->assertJsonPath('user.id', $broker->id);
});

it('resends pending invite', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
        'last_sent_at' => now()->subDays(3),
    ]);
    $oldToken = $invite->token;
    $oldLastSentAt = $invite->last_sent_at;

    Sanctum::actingAs($user);

    $this->postJson("/api/builder/invites/{$invite->id}/resend")
        ->assertOk()
        ->assertJsonPath('status', 'pending');

    $fresh = $invite->fresh();

    expect($fresh->token)->not->toBe($oldToken)
        ->and($fresh->last_sent_at->greaterThan($oldLastSentAt))->toBeTrue();
    Mail::assertSent(BrokerInviteMail::class);
});

it('revokes pending invite via delete endpoint', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
    ]);

    Sanctum::actingAs($user);

    $this->deleteJson("/api/builder/invites/{$invite->id}")
        ->assertOk()
        ->assertJsonPath('status', 'revoked');

    expect(BrokerInvite::query()->find($invite->id))->not->toBeNull()
        ->and($invite->fresh()->revoked_at)->not->toBeNull();
});

it('lists units by building access for broker', function () {
    $tenant = Tenant::factory()->create(['name' => 'Construtora Alpha']);
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create(['code' => '777']);
    Unit::factory()->for($tenant)->for($building)->create(['code' => '888']);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonCount(2)
        ->assertJsonPath('0.building.tenant.name', 'Construtora Alpha');
});

it('includes cover image on building when listing broker units', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();
    Unit::factory()->for($tenant)->for($building)->create(['code' => '101']);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    $cover = BuildingMedia::factory()->for($building)->internal()->published()->create([
        'sort_order' => 0,
        'mime_type' => 'image/jpeg',
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonPath('0.building.cover_image.id', $cover->id)
        ->assertJsonPath('0.building.cover_image.url', "/broker/buildings/{$building->id}/media/{$cover->id}/file");
});

it('lists units by legacy unit access for broker', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['code' => '777']);

    UnitAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'unit_id' => $unit->id,
    ]);

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/units')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.code', '777');
});

it('grants building access from builder', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/brokers/{$broker->id}/buildings", [
        'building_id' => $building->id,
    ])->assertCreated();
});

it('lists linked brokers for builder', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/brokers')
        ->assertOk()
        ->assertJsonFragment([
            'email' => $broker->email,
            'buildings_count' => 0,
            'buildings' => [],
        ]);
});
