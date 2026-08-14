<?php

/**
 * @see REQ-BLD-RES-001
 * @see REQ-BLD-RES-002
 * @see REQ-BLD-RES-003
 */
use App\Enums\UnitStatus;
use App\Models\BrokerClient;
use App\Models\Building;
use App\Models\Reservation;
use App\Models\ReservationMessage;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Laravel\Sanctum\Sanctum;

it('lists reservations for builder tenant', function () {
    $tenant = Tenant::factory()->create();
    $otherTenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create(['name' => 'Corretor Alpha']);
    $client = BrokerClient::factory()->for($broker, 'broker')->create(['name' => 'João Silva']);
    $building = Building::factory()->for($tenant)->create(['name' => 'Residencial Aurora']);
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'status' => UnitStatus::Reserved,
    ]);

    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
        'client_id' => $client->id,
    ]);

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $broker->id,
        'body' => 'Cliente interessado em planta maior.',
    ]);

    $otherUnit = Unit::factory()->for($otherTenant)->create(['status' => UnitStatus::Reserved]);
    Reservation::factory()->create([
        'tenant_id' => $otherTenant->id,
        'unit_id' => $otherUnit->id,
    ]);

    Sanctum::actingAs($builder);

    $response = $this->getJson('/api/builder/reservations')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.client.name', 'João Silva')
        ->assertJsonPath('0.broker.name', 'Corretor Alpha')
        ->assertJsonPath('0.unit.building.name', 'Residencial Aurora')
        ->assertJsonPath('0.messages_count', 1)
        ->assertJsonPath('0.needs_reply', true)
        ->assertJsonPath('0.situation.previous.label', 'Decisão do gestor')
        ->assertJsonPath('0.situation.current.key', 'deposit_window')
        ->assertJsonPath('0.situation.current.label', 'Aguardando sinal (48h)')
        ->assertJsonPath('0.situation.current.status', 'current')
        ->assertJsonPath('0.situation.current.waiting_on', 'broker')
        ->assertJsonPath('0.situation.next.label', 'Comprovante de pagamento');

    expect($response->json('0.situation.current.occurred_at'))->toBeString()->not->toBeEmpty();
    expect($response->json('0.situation.previous.occurred_at'))->toBeString()->not->toBeEmpty();
});

it('returns pending replies count for builder', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationMessage::factory()->create([
        'reservation_id' => $reservation->id,
        'user_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations/pending-replies-count')
        ->assertOk()
        ->assertJsonPath('count', 1);
});

it('rejects builder reservation list without permission', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::VIEW_BUILDINGS,
    ])->for($tenant)->create();

    Sanctum::actingAs($builder);

    $this->getJson('/api/builder/reservations')->assertForbidden();
});

it('allows builder to reply on reservation thread', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/messages", [
        'body' => 'Reserva confirmada internamente.',
    ])
        ->assertCreated()
        ->assertJsonPath('body', 'Reserva confirmada internamente.')
        ->assertJsonPath('author.role', 'builder');

    $this->getJson("/api/builder/reservations/{$reservation->id}/messages")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.author.name', $builder->name);
});

it('rejects builder messages for another tenant reservation', function () {
    $tenant = Tenant::factory()->create();
    $otherTenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $unit = Unit::factory()->for($otherTenant)->create(['status' => UnitStatus::Reserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $otherTenant->id,
        'unit_id' => $unit->id,
    ]);

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/messages")->assertNotFound();
    $this->postJson("/api/builder/reservations/{$reservation->id}/messages", [
        'body' => 'Teste',
    ])->assertNotFound();
});

it('requires a reason when builder cancels a reservation', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    $reservation = Reservation::factory()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
    ]);

    Sanctum::actingAs($builder);

    $this->deleteJson("/api/builder/reservations/{$reservation->id}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['reason']);
});
