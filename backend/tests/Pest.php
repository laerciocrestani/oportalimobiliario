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

use App\Models\BrokerTenant;
use App\Models\Tenant;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
