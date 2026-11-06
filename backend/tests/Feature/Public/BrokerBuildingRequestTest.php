<?php

use App\Mail\BrokerAccessRequestMail;
use App\Mail\BrokerEmailConfirmationMail;
use App\Models\BrokerBuildingRequest;
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Tenant;
use App\Models\User;
use App\Services\BrokerEmailConfirmationService;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;

function brokerAccountPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Ana Corretores',
        'phone' => '11988887777',
        'email' => 'ana@corretores.test',
        'password' => 'password1',
        'password_confirmation' => 'password1',
    ], $overrides);
}

it('registers a broker from a published building and leaves the request pending', function () {
    Mail::fake();
    $tenant = Tenant::factory()->create();
    User::factory()->builder()->for($tenant)->create(['email' => 'construtora@alpha.demo']);
    $building = Building::factory()->for($tenant)->published()->create(['name' => 'Residencial Aurora']);
    Building::factory()->for($tenant)->published()->create(['name' => 'Outro']);

    $this->postJson("/api/public/buildings/{$building->slug}/broker-account", brokerAccountPayload())
        ->assertCreated()
        ->assertJsonPath('email_confirmation_required', true)
        ->assertJsonPath('message', BrokerEmailConfirmationService::MESSAGE)
        ->assertJsonMissingPath('token');

    $broker = User::query()->where('email', 'ana@corretores.test')->first();

    expect($broker)->not->toBeNull()
        ->and($broker->email_verified_at)->toBeNull()
        ->and(BrokerTenant::query()->where('broker_id', $broker->id)->where('tenant_id', $tenant->id)->value('approved_at'))->toBeNull()
        ->and(BrokerBuildingRequest::query()->where('broker_id', $broker->id)->where('building_id', $building->id)->exists())->toBeTrue()
        ->and(BuildingAccess::query()->where('broker_id', $broker->id)->count())->toBe(0);

    Mail::assertSent(BrokerAccessRequestMail::class);
    Mail::assertSent(BrokerEmailConfirmationMail::class, function (BrokerEmailConfirmationMail $mail): bool {
        return $mail->hasTo('ana@corretores.test')
            && str_contains($mail->render(), 'Confirmar acesso');
    });
});

it('keeps the api host port in the confirmation link', function () {
    Mail::fake();
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();

    $this->postJson(
        "http://localhost:8000/api/public/buildings/{$building->slug}/broker-account",
        brokerAccountPayload(['email' => 'porta@corretores.test', 'phone' => '11977776666']),
    )->assertCreated();

    Mail::assertSent(BrokerEmailConfirmationMail::class, function (BrokerEmailConfirmationMail $mail): bool {
        return str_starts_with($mail->confirmUrl, 'http://localhost:8000/api/auth/broker-email/confirm?');
    });
});

it('opens the broker dashboard logged in after the email confirmation link', function () {
    Mail::fake();
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();

    $this->postJson("/api/public/buildings/{$building->slug}/broker-account", brokerAccountPayload())
        ->assertCreated();

    $confirmUrl = null;

    Mail::assertSent(BrokerEmailConfirmationMail::class, function (BrokerEmailConfirmationMail $mail) use (&$confirmUrl): bool {
        $confirmUrl = $mail->confirmUrl;

        return true;
    });

    $location = $this->get($confirmUrl)->assertRedirect()->headers->get('Location');

    expect($location)->toContain('/session-bridge?code=');

    parse_str((string) parse_url((string) $location, PHP_URL_QUERY), $query);

    $this->postJson('/api/auth/handoff/exchange', ['code' => $query['code']])
        ->assertSuccessful()
        ->assertJsonStructure(['token']);

    expect(User::query()->where('email', 'ana@corretores.test')->first()?->email_verified_at)->not->toBeNull();
});

it('rejects an expired broker email confirmation link', function () {
    $this->get('/api/auth/broker-email/confirm?user=1&expires=1&signature=invalid')
        ->assertRedirect(rtrim((string) config('opim.frontend_urls.broker'), '/').'/login?confirmation=expired');
});

it('asks an existing broker to sign in instead of creating another account', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();
    User::factory()->broker()->create([
        'email' => 'ana@corretores.test',
        'phone' => '+5511988887777',
    ]);

    $this->postJson("/api/public/buildings/{$building->slug}/broker-account", brokerAccountPayload())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');

    expect(User::query()->where('email', 'ana@corretores.test')->count())->toBe(1);
});

it('rejects registration on an unpublished building', function () {
    $building = Building::factory()->for(Tenant::factory())->create(['published' => false]);

    $this->postJson("/api/public/buildings/{$building->slug}/broker-account", brokerAccountPayload())
        ->assertNotFound();
});

it('files a building request for a logged in broker and keeps other buildings closed', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create(['name' => 'Residencial Aurora']);
    $other = Building::factory()->for($tenant)->published()->create();
    $broker = User::factory()->broker()->create();
    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/buildings/{$building->slug}/access-requests")
        ->assertSuccessful()
        ->assertJsonPath('status', 'pending');

    $this->postJson("/api/broker/buildings/{$building->slug}/access-requests")
        ->assertSuccessful()
        ->assertJsonPath('status', 'already_pending');

    expect(BrokerBuildingRequest::query()->count())->toBe(1)
        ->and(BuildingAccess::query()->where('building_id', $other->id)->exists())->toBeFalse();
});

it('refuses a request when the broker already sells that building', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();
    $broker = User::factory()->broker()->create();
    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'approved_at' => now(),
    ]);
    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);
    Sanctum::actingAs($broker);

    $this->postJson("/api/broker/buildings/{$building->slug}/access-requests")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('building');
});

it('approves only the requested building and links the broker', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->published()->create(['name' => 'Residencial Aurora']);
    $other = Building::factory()->for($tenant)->published()->create();
    $broker = User::factory()->broker()->create(['name' => 'Ana Corretores']);
    $link = BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'approved_at' => null,
    ]);
    $request = BrokerBuildingRequest::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/pending-brokers')
        ->assertSuccessful()
        ->assertJsonPath('0.building_name', 'Residencial Aurora')
        ->assertJsonPath('0.name', 'Ana Corretores')
        ->assertJsonPath('0.building_request_id', $request->id);

    $this->postJson("/api/builder/building-requests/{$request->id}/approve")
        ->assertSuccessful()
        ->assertJsonPath('building_id', $building->id);

    expect($link->fresh()->approved_at)->not->toBeNull()
        ->and(BuildingAccess::query()->where('broker_id', $broker->id)->where('building_id', $building->id)->exists())->toBeTrue()
        ->and(BuildingAccess::query()->where('building_id', $other->id)->exists())->toBeFalse()
        ->and(BrokerBuildingRequest::query()->whereKey($request->id)->exists())->toBeFalse();
});

it('rejects a new broker and drops the pending link', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->published()->create();
    $broker = User::factory()->broker()->create();
    $link = BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'approved_at' => null,
    ]);
    $request = BrokerBuildingRequest::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/building-requests/{$request->id}/reject")
        ->assertNoContent();

    expect(BrokerBuildingRequest::query()->whereKey($request->id)->exists())->toBeFalse()
        ->and(BrokerTenant::query()->whereKey($link->id)->exists())->toBeFalse()
        ->and(BuildingAccess::query()->count())->toBe(0);
});

it('rejects one building without unlinking an approved broker', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->published()->create();
    $broker = User::factory()->broker()->create();
    $link = BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'approved_at' => now(),
    ]);
    $request = BrokerBuildingRequest::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/building-requests/{$request->id}/reject")
        ->assertNoContent();

    expect($link->fresh())->not->toBeNull()
        ->and(BuildingAccess::query()->count())->toBe(0);
});

it('hands the broker session to the dashboard with a one-time code', function () {
    $broker = User::factory()->broker()->create();
    Sanctum::actingAs($broker);

    $code = $this->postJson('/api/auth/handoff')
        ->assertSuccessful()
        ->json('code');

    $this->postJson('/api/auth/handoff/exchange', ['code' => $code])
        ->assertSuccessful()
        ->assertJsonStructure(['token']);

    $this->postJson('/api/auth/handoff/exchange', ['code' => $code])
        ->assertUnprocessable();
});

it('hides a building request from another builder', function () {
    $tenant = Tenant::factory()->create();
    $other = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($other)->create();
    $request = BrokerBuildingRequest::factory()->create([
        'tenant_id' => $tenant->id,
        'building_id' => Building::factory()->for($tenant)->published()->create()->id,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/building-requests/{$request->id}/approve")
        ->assertNotFound();
});
