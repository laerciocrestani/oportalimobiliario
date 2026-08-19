<?php

/**
 * @see REQ-WIZ-012
 * @see REQ-WIZ-013
 */
use App\Enums\InccIndexSource;
use App\Models\InccIndex;
use App\Models\Tenant;
use App\Tenancy\Concerns\BelongsToTenant;
use App\Tenancy\TenantContext;
use Database\Seeders\InccIndexSeeder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Schema;

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
