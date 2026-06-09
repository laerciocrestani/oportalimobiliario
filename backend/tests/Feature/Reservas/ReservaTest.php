<?php

/**
 * @see REQ-RES-001
 * @see REQ-RES-002
 * @see REQ-RES-004
 */
use App\Enums\UnidadeStatus;
use App\Models\AcessoUnidade;
use App\Models\Reserva;
use App\Models\Tenant;
use App\Models\Unidade;
use App\Models\User;
use App\Services\ReservaExpirationService;
use Laravel\Sanctum\Sanctum;

it('creates reserva for accessible unidade', function () {
    $tenant = Tenant::factory()->create();
    $corretor = User::factory()->corretor()->create();
    $unidade = Unidade::factory()->for($tenant)->create(['status' => UnidadeStatus::Disponivel]);

    AcessoUnidade::factory()->create([
        'tenant_id' => $tenant->id,
        'corretor_id' => $corretor->id,
        'unidade_id' => $unidade->id,
    ]);

    Sanctum::actingAs($corretor);

    $this->postJson('/api/corretor/reservas', ['unidade_id' => $unidade->id])
        ->assertCreated()
        ->assertJsonPath('unidade_id', $unidade->id);

    expect($unidade->fresh()->status)->toBe(UnidadeStatus::Reservada);
});

it('rejects reserva without acesso', function () {
    $unidade = Unidade::factory()->create(['status' => UnidadeStatus::Disponivel]);
    $corretor = User::factory()->corretor()->create();

    Sanctum::actingAs($corretor);

    $this->postJson('/api/corretor/reservas', ['unidade_id' => $unidade->id])
        ->assertForbidden();
});

it('expires reservas and frees unidade', function () {
    $tenant = Tenant::factory()->create();
    $unidade = Unidade::factory()->for($tenant)->create(['status' => UnidadeStatus::Reservada]);
    Reserva::factory()->create([
        'tenant_id' => $tenant->id,
        'unidade_id' => $unidade->id,
        'expires_at' => now()->subMinute(),
    ]);

    $count = app(ReservaExpirationService::class)->expireDueReservas();

    expect($count)->toBe(1);
    expect(Reserva::query()->count())->toBe(0);
    expect($unidade->fresh()->status)->toBe(UnidadeStatus::Disponivel);
});

it('runs expire command', function () {
    $this->artisan('opim:expire-reservas')->assertSuccessful();
});
