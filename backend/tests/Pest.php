<?php

/*
| Força ambiente de testes antes do Laravel bootar.
| Sem isso, .env local (pgsql) era usado e RefreshDatabase apagava o banco de dev.
*/
$_SERVER['APP_ENV'] = 'testing';
$_ENV['APP_ENV'] = 'testing';
putenv('APP_ENV=testing');

$_SERVER['DB_CONNECTION'] = 'sqlite';
$_ENV['DB_CONNECTION'] = 'sqlite';
putenv('DB_CONNECTION=sqlite');

$_SERVER['DB_DATABASE'] = ':memory:';
$_ENV['DB_DATABASE'] = ':memory:';
putenv('DB_DATABASE=:memory:');

$_SERVER['DB_URL'] = '';
$_ENV['DB_URL'] = '';
putenv('DB_URL');

use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\BrokerTenant;
use App\Models\Reservation;
use App\Models\ReservationTimelineEvent;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Models\UserActivityEvent;
use App\Support\BuilderPermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature', 'Unit');

uses(RefreshDatabase::class)->in('Feature', 'Unit');

beforeEach(function () {
    BuilderPermissions::seed();
})->in('Feature');

function linkBrokerToTenant(User $broker, Tenant $tenant): void
{
    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function validProposalPayload(array $overrides = []): array
{
    return array_merge([
        'client_name' => 'Maria Silva',
        'client_email' => 'maria@example.com',
        'client_phone' => '11999999999',
        'client_cpf' => '12345678901',
        'address' => 'Rua A, 100',
        'city' => 'São Paulo',
        'state' => 'SP',
        'zip' => '01000-000',
        'marital_status' => 'solteira',
        'nationality' => 'brasileira',
        'land_value' => 150000,
        'payment_terms' => 'Pix R$ 10.000 + 24x R$ 5.000',
    ], $overrides);
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function validProposalRequest(array $overrides = []): array
{
    $files = $overrides['files'] ?? [
        UploadedFile::fake()->create('proposta.pdf', 80, 'application/pdf'),
    ];
    unset($overrides['files']);

    return array_merge(validProposalPayload($overrides), [
        'files' => $files,
    ]);
}

function signedProposalPdf(string $name = 'proposta-assinada.pdf'): UploadedFile
{
    return UploadedFile::fake()->create($name, 80, 'application/pdf');
}

function assertUserActivity(User $actor, UserActivityAction $action, string $messageContains, ?int $resourceId = null): UserActivityEvent
{
    $query = UserActivityEvent::query()
        ->where('actor_user_id', $actor->id)
        ->where('action', $action);

    if ($resourceId !== null) {
        $query->where('resource_id', $resourceId);
    }

    $event = $query->latest('id')->first();

    expect($event)->not->toBeNull();
    expect($event->message)->toContain($messageContains);

    return $event;
}

function createContractIssuedReservation(Tenant $tenant, User $broker, Unit $unit): Reservation
{
    $reservation = Reservation::factory()->contractIssued()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ContractIssued,
        'actor_id' => $broker->id,
    ]);

    return $reservation;
}

/**
 * @return array{0: User, 1: User}
 */
function createWitnesses(Tenant $tenant): array
{
    return [
        User::factory()->builder()->withBuilderPermissions([
            BuilderPermissions::VIEW_BUILDINGS,
        ])->for($tenant)->create(['name' => 'Testemunha Um']),
        User::factory()->builder()->withBuilderPermissions([
            BuilderPermissions::VIEW_BUILDINGS,
        ])->for($tenant)->create(['name' => 'Testemunha Dois']),
    ];
}

function uploadBuyerAndBuilderContracts(
    Reservation $reservation,
    User $broker,
    User $builder,
    User $witness1,
    User $witness2,
): void {
    Sanctum::actingAs($broker);
    test()->postJson("/api/broker/reservations/{$reservation->id}/contract/gov")->assertOk();
    test()->post("/api/broker/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-comprador.pdf', 120, 'application/pdf'),
    ])->assertCreated();

    Sanctum::actingAs($builder);
    test()->post("/api/builder/reservations/{$reservation->id}/contract/signed", [
        'file' => UploadedFile::fake()->create('contrato-construtora.pdf', 120, 'application/pdf'),
        'witness_1_user_id' => $witness1->id,
        'witness_2_user_id' => $witness2->id,
    ])->assertCreated();
}

function witnessFlowSetup(): array
{
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create(['status' => UnitStatus::Reserved]);
    [$witness1, $witness2] = createWitnesses($tenant);

    linkBrokerToTenant($broker, $tenant);

    $reservation = createContractIssuedReservation($tenant, $broker, $unit);
    uploadBuyerAndBuilderContracts($reservation, $broker, $builder, $witness1, $witness2);

    return compact('tenant', 'builder', 'broker', 'unit', 'witness1', 'witness2', 'reservation');
}
