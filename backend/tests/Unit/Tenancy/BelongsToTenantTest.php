<?php

/**
 * @see REQ-TEN-002
 */
use App\Models\Tenant;
use App\Models\TenantNote;
use App\Tenancy\TenantContext;

afterEach(function () {
    TenantContext::forget();
});

it('filters records by active tenant context', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    TenantNote::factory()->for($alpha)->create(['title' => 'Alpha note']);
    TenantNote::factory()->for($beta)->create(['title' => 'Beta note']);

    TenantContext::set($alpha->id);

    $titles = TenantNote::query()->pluck('title')->all();

    expect($titles)->toBe(['Alpha note']);
});

it('auto assigns tenant_id on create when context is active', function () {
    $tenant = Tenant::factory()->create();
    TenantContext::set($tenant->id);

    $note = TenantNote::query()->create(['title' => 'Scoped']);

    expect($note->tenant_id)->toBe($tenant->id);
});

it('returns all records when tenant context is absent', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    TenantNote::factory()->for($alpha)->create();
    TenantNote::factory()->for($beta)->create();

    expect(TenantNote::query()->count())->toBe(2);
});
