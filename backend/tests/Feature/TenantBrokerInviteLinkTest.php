<?php

use App\Mail\BrokerInviteMail;
use App\Models\BrokerInvite;
use Illuminate\Support\Facades\Mail;
use App\Models\BrokerTenant;
use App\Models\Tenant;
use App\Models\TenantBrokerInviteLink;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('returns or creates tenant invite link for builder', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/invite-link')
        ->assertOk()
        ->assertJsonStructure(['token', 'invite_url', 'created_at']);

    expect(TenantBrokerInviteLink::query()->where('tenant_id', $tenant->id)->count())->toBe(1);
});

it('regenerates tenant invite link token', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $link = TenantBrokerInviteLink::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
    ]);
    $originalToken = $link->token;

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invite-link/regenerate')
        ->assertOk()
        ->assertJsonPath('token', fn ($token) => $token !== $originalToken)
        ->assertJsonStructure(['regenerated_at']);
});

it('previews open join link', function () {
    $tenant = Tenant::factory()->create(['name' => 'Construtora Demo']);
    $user = User::factory()->builder()->for($tenant)->create();
    $link = TenantBrokerInviteLink::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
    ]);

    $this->getJson('/api/broker/join/preview?token='.$link->token)
        ->assertOk()
        ->assertJson([
            'tenant_name' => 'Construtora Demo',
            'type' => 'open',
        ]);
});

it('registers broker via open link and requires builder approval', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();
    $link = TenantBrokerInviteLink::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
    ]);

    $this->postJson('/api/broker/join/register', [
        'token' => $link->token,
        'name' => 'Corretor Link Aberto',
        'phone' => '(11) 98888-7777',
        'email' => 'link.aberto@demo.com',
        'password' => 'password123',
    ])
        ->assertCreated()
        ->assertJsonPath('pending_approval', true)
        ->assertJsonPath('user.name', 'Corretor Link Aberto')
        ->assertJsonPath('user.email', 'link.aberto@demo.com');

    $broker = User::query()->where('email', 'link.aberto@demo.com')->first();
    expect($broker)->not->toBeNull();

    $tenantLink = BrokerTenant::query()
        ->where('tenant_id', $tenant->id)
        ->where('broker_id', $broker->id)
        ->first();

    expect($tenantLink)->not->toBeNull()
        ->and($tenantLink->approved_at)->toBeNull()
        ->and($tenantLink->tenant_broker_invite_link_id)->toBe($link->id);
});

it('requires email when registering via open link', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();
    $link = TenantBrokerInviteLink::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
    ]);

    $this->postJson('/api/broker/join/register', [
        'token' => $link->token,
        'name' => 'Corretor Sem Email',
        'phone' => '(11) 98888-7777',
        'password' => 'password123',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('registers broker with email via open link', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();
    $link = TenantBrokerInviteLink::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $user->id,
    ]);

    $this->postJson('/api/broker/join/register', [
        'token' => $link->token,
        'name' => 'Corretor Com Email',
        'phone' => '(21) 97777-6666',
        'email' => 'corretor@demo.com',
        'password' => 'password123',
    ])->assertCreated();

    expect(User::query()->where('email', 'corretor@demo.com')->exists())->toBeTrue();
});

it('rejects open link registration when individual email invite is pending', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $openLink = TenantBrokerInviteLink::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
    ]);

    BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'novo.corretor@demo.com',
    ]);

    $this->postJson('/api/broker/join/register', [
        'token' => $openLink->token,
        'name' => 'Corretor Duplicado',
        'phone' => '(11) 98888-7777',
        'email' => 'novo.corretor@demo.com',
        'password' => 'password123',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'invite_resend']);

    expect(User::query()->where('email', 'novo.corretor@demo.com')->exists())->toBeFalse();
});

it('rejects open link registration when individual whatsapp invite is pending', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $openLink = TenantBrokerInviteLink::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
    ]);

    BrokerInvite::factory()->whatsapp()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'phone' => '+5511999887766',
    ]);

    $this->postJson('/api/broker/join/register', [
        'token' => $openLink->token,
        'name' => 'Corretor WhatsApp',
        'phone' => '(11) 99988-7766',
        'email' => 'whatsapp.corretor@demo.com',
        'password' => 'password123',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['phone']);
});

it('resends individual invite from open join page', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();
    $openLink = TenantBrokerInviteLink::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
    ]);

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'email' => 'novo.corretor@demo.com',
    ]);
    $oldToken = $invite->token;

    $this->postJson('/api/broker/join/resend-individual-invite', [
        'token' => $openLink->token,
        'email' => 'novo.corretor@demo.com',
        'phone' => '(11) 98888-7777',
    ])
        ->assertOk()
        ->assertJsonPath('channel', 'email')
        ->assertJsonPath('message', 'Convite reenviado para o seu e-mail.');

    expect($invite->fresh()->token)->not->toBe($oldToken);
    Mail::assertSent(BrokerInviteMail::class);
});

it('reconciles pending open link approval with matching individual invite', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create([
        'email' => 'novo.corretor@demo.com',
        'phone' => '+5511988887777',
    ]);

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

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/pending-brokers/{$tenantLink->id}/approve")
        ->assertOk();

    expect($tenantLink->fresh()->approved_at)->not->toBeNull()
        ->and($tenantLink->fresh()->broker_invite_id)->toBe($invite->id)
        ->and($invite->fresh()->accepted_at)->not->toBeNull()
        ->and($invite->fresh()->broker_id)->toBe($broker->id);
});

it('lists pending brokers for builder approval', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create([
        'name' => 'Pendente',
        'phone' => '+5511999999999',
    ]);

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'approved_at' => null,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/pending-brokers')
        ->assertOk()
        ->assertJsonFragment(['name' => 'Pendente', 'phone' => '+5511999999999']);
});

it('approves pending broker from open link', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $link = BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'approved_at' => null,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/pending-brokers/{$link->id}/approve")
        ->assertOk()
        ->assertJsonPath('id', $broker->id);

    expect($link->fresh()->approved_at)->not->toBeNull();
});

it('rejects pending broker from open link', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $link = BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'approved_at' => null,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/pending-brokers/{$link->id}/reject")
        ->assertNoContent();

    expect(BrokerTenant::query()->find($link->id))->toBeNull();
});

it('excludes pending brokers from approved broker list', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $approvedBroker = User::factory()->broker()->create(['name' => 'Aprovado']);
    $pendingBroker = User::factory()->broker()->create(['name' => 'Pendente']);

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $approvedBroker->id,
    ]);

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $pendingBroker->id,
        'approved_at' => null,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/brokers')
        ->assertOk()
        ->assertJsonFragment(['name' => 'Aprovado'])
        ->assertJsonMissing(['name' => 'Pendente']);
});

it('rejects creating invite with link channel', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/builder/invites', [
        'name' => 'Corretor Link',
        'channel' => 'link',
    ])->assertUnprocessable();
});

it('allows broker login with phone when email is synthetic', function () {
    $broker = User::factory()->broker()->create([
        'email' => 'phone+5511988887777@internal.oportalimobiliario.local',
        'phone' => '+5511988887777',
        'password' => bcrypt('password123'),
    ]);

    $this->postJson('/api/auth/login', [
        'email' => '(11) 98888-7777',
        'password' => 'password123',
    ])
        ->assertOk()
        ->assertJsonPath('user.id', $broker->id)
        ->assertJsonPath('user.email', null);
});

it('returns pending approvals on broker profile', function () {
    $tenant = Tenant::factory()->create(['name' => 'Construtora ABC']);
    $broker = User::factory()->broker()->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'approved_at' => null,
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/profile')
        ->assertOk()
        ->assertJsonPath('pending_approvals.0.tenant_name', 'Construtora ABC')
        ->assertJsonPath('access_status', 'pending_only')
        ->assertJsonPath('has_approved_access', false);
});

it('denies invite link management without permission', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/builder/invite-link')->assertForbidden();
});
