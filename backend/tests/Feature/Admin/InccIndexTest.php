<?php

/**
 * @see REQ-WIZ-012
 * @see REQ-WIZ-013
 */
use App\Enums\InccIndexSource;
use App\Models\InccIndex;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\Concerns\BelongsToTenant;
use App\Tenancy\TenantContext;
use Database\Seeders\InccIndexSeeder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

afterEach(function () {
    TenantContext::forget();
});

it('stores incc indices as a global admin table without tenant_id', function () {
    expect(Schema::hasTable('incc_indices'))->toBeTrue()
        ->and(Schema::hasColumn('incc_indices', 'tenant_id'))->toBeFalse()
        ->and(Schema::hasColumns('incc_indices', ['competence', 'value', 'source', 'fetched_at']))->toBeTrue()
        ->and(class_uses_recursive(InccIndex::class))->not->toContain(BelongsToTenant::class);
});

it('does not isolate incc indices by tenant context', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    InccIndex::factory()->create(['competence' => '2026-06-01', 'value' => '1010.123456']);
    InccIndex::factory()->create(['competence' => '2026-07-01', 'value' => '1015.654321']);

    TenantContext::set($alpha->id);
    $alphaCount = InccIndex::query()->count();

    TenantContext::set($beta->id);
    $betaCount = InccIndex::query()->count();

    TenantContext::forget();

    expect($alphaCount)->toBe(2)
        ->and($betaCount)->toBe(2)
        ->and(InccIndex::query()->count())->toBe(2);
});

it('persists competence value and source casts', function () {
    $index = InccIndex::factory()->fromJob()->create([
        'competence' => '2026-07-01',
        'value' => '1020.500000',
    ]);

    $index->refresh();

    expect($index->competence->toDateString())->toBe('2026-07-01')
        ->and($index->value)->toBe('1020.500000')
        ->and($index->source)->toBe(InccIndexSource::Job)
        ->and($index->fetched_at)->not->toBeNull();
});

it('rejects duplicate competence months', function () {
    InccIndex::factory()->create(['competence' => '2026-07-01']);

    InccIndex::factory()->create(['competence' => '2026-07-01']);
})->throws(UniqueConstraintViolationException::class);

it('seeds incc indices once and remains idempotent', function () {
    (new InccIndexSeeder)->run();

    $firstCount = InccIndex::query()->count();

    expect($firstCount)->toBe(count(InccIndexSeeder::definitions()))
        ->and($firstCount)->toBeGreaterThan(0);

    (new InccIndexSeeder)->run();

    expect(InccIndex::query()->count())->toBe($firstCount);
});

it('lists incc indices for admin newest competence first', function () {
    InccIndex::factory()->create(['competence' => '2026-06-01', 'value' => '1016.330000']);
    InccIndex::factory()->create(['competence' => '2026-07-01', 'value' => '1020.500000']);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/incc-indices')
        ->assertOk()
        ->assertJsonCount(2)
        ->assertJsonPath('0.competence', '2026-07-01')
        ->assertJsonPath('1.competence', '2026-06-01');
});

it('creates a manual incc index as admin', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson('/api/admin/incc-indices', [
        'competence' => '2026-08-15',
        'value' => 1024.75,
    ])
        ->assertCreated()
        ->assertJsonPath('competence', '2026-08-01')
        ->assertJsonPath('value', '1024.750000')
        ->assertJsonPath('source', 'manual')
        ->assertJsonPath('fetched_at', null);
});

it('rejects duplicate competence on create', function () {
    InccIndex::factory()->create(['competence' => '2026-07-01']);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson('/api/admin/incc-indices', [
        'competence' => '2026-07-20',
        'value' => 1030,
    ])->assertUnprocessable();
});

it('updates an incc index value without changing source', function () {
    $index = InccIndex::factory()->fromJob()->create([
        'competence' => '2026-07-01',
        'value' => '1020.500000',
    ]);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->patchJson("/api/admin/incc-indices/{$index->id}", [
        'value' => 1021.1,
    ])
        ->assertOk()
        ->assertJsonPath('value', '1021.100000')
        ->assertJsonPath('source', 'job')
        ->assertJsonPath('competence', '2026-07-01');
});

it('returns the bcb hint without persisting', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.bcb.gov.br/*' => Http::response([
            ['data' => '01/07/2026', 'valor' => '1020.5'],
        ]),
    ]);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/incc-indices/hint')
        ->assertOk()
        ->assertJsonPath('competence', '2026-07-01')
        ->assertJsonPath('value', '1020.500000')
        ->assertJsonPath('is_index_number', true);

    expect(InccIndex::query()->count())->toBe(0);
});

it('flags bcb variation percent on hint', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.bcb.gov.br/*' => Http::response([
            ['data' => '01/07/2026', 'valor' => '0.62'],
        ]),
    ]);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/incc-indices/hint')
        ->assertOk()
        ->assertJsonPath('is_index_number', false)
        ->assertJsonPath('value', '0.620000');

    expect(InccIndex::query()->count())->toBe(0);
});

it('returns unavailable when bcb hint cannot be fetched', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.bcb.gov.br/*' => Http::failedConnection(),
    ]);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/incc-indices/hint')
        ->assertStatus(503);
});

it('denies admin incc routes to builder', function () {
    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->getJson('/api/admin/incc-indices')->assertForbidden();
    $this->getJson('/api/admin/incc-indices/hint')->assertForbidden();
});

it('requires authentication for admin incc routes', function () {
    $this->getJson('/api/admin/incc-indices')->assertUnauthorized();
    $this->postJson('/api/admin/incc-indices', [
        'competence' => '2026-08-01',
        'value' => 1024,
    ])->assertUnauthorized();
});
