<?php

use App\Models\Reservation;
use App\Models\ReservationProposal;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('returns the latest buyer of the broker for a known cpf', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    linkBrokerToTenant($broker, $tenant);

    $unit = Unit::factory()->for($tenant)->create();
    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'client_name' => 'Maria Antiga',
        'client_cpf' => '52998224725',
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'party_kind' => 'individual',
        'client_name' => 'Maria Silva',
        'client_phone' => '11988887777',
        'client_email' => 'maria@example.com',
        'client_cpf' => '52998224725',
        'client_rg' => '1234567',
        'address' => 'Rua A, 10',
        'city' => 'São Paulo',
        'state' => 'SP',
        'zip' => '01001000',
        'marital_status' => 'Casado(a)',
        'nationality' => 'brasileira',
        'profession' => 'Arquiteta',
        'spouse_name' => 'João Silva',
        'spouse_cpf' => '39053344705',
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/buyers?document=529.982.247-25')
        ->assertOk()
        ->assertJsonPath('party_kind', 'individual')
        ->assertJsonPath('client_name', 'Maria Silva')
        ->assertJsonPath('client_phone', '11988887777')
        ->assertJsonPath('client_email', 'maria@example.com')
        ->assertJsonPath('client_cpf', '52998224725')
        ->assertJsonPath('client_rg', '1234567')
        ->assertJsonPath('address', 'Rua A, 10')
        ->assertJsonPath('city', 'São Paulo')
        ->assertJsonPath('state', 'SP')
        ->assertJsonPath('zip', '01001000')
        ->assertJsonPath('marital_status', 'Casado(a)')
        ->assertJsonPath('profession', 'Arquiteta')
        ->assertJsonPath('spouse_name', 'João Silva')
        ->assertJsonPath('spouse_cpf', '39053344705');
});

it('returns a company buyer by cnpj', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    linkBrokerToTenant($broker, $tenant);

    $unit = Unit::factory()->for($tenant)->create();
    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $broker->id,
        'party_kind' => 'company',
        'client_name' => 'Silva Incorporações',
        'client_cpf' => '11444777000161',
    ]);

    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/buyers?document=11444777000161')
        ->assertOk()
        ->assertJsonPath('party_kind', 'company')
        ->assertJsonPath('client_name', 'Silva Incorporações');
});

it('hides a buyer that belongs to another broker', function () {
    $tenant = Tenant::factory()->create();
    $owner = User::factory()->broker()->create();
    $intruder = User::factory()->broker()->create();
    linkBrokerToTenant($intruder, $tenant);

    $unit = Unit::factory()->for($tenant)->create();
    $reservation = Reservation::factory()->preHold()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $owner->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'submitted_by' => $owner->id,
        'client_cpf' => '52998224725',
        'client_name' => 'Maria Silva',
    ]);

    Sanctum::actingAs($intruder);

    $this->getJson('/api/broker/buyers?document=52998224725')
        ->assertNotFound();
});

it('rejects a document that is not a cpf or cnpj', function () {
    $broker = User::factory()->broker()->create();
    $tenant = Tenant::factory()->create();
    linkBrokerToTenant($broker, $tenant);
    Sanctum::actingAs($broker);

    $this->getJson('/api/broker/buyers?document=123')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['document']);
});

it('requires authentication to look up a buyer', function () {
    $this->getJson('/api/broker/buyers?document=52998224725')
        ->assertUnauthorized();
});
