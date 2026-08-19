<?php

/**
 * @see REQ-WIZ-010
 */
use App\Models\Amenity;
use App\Models\Building;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Tenancy\Concerns\BelongsToTenant;
use App\Tenancy\TenantContext;
use Database\Seeders\AmenitySeeder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

afterEach(function () {
    TenantContext::forget();
});

it('stores amenities as a global admin table without tenant_id', function () {
    expect(Schema::hasTable('amenities'))->toBeTrue()
        ->and(Schema::hasColumn('amenities', 'tenant_id'))->toBeFalse()
        ->and(Schema::hasColumns('amenities', ['slug', 'name', 'active']))->toBeTrue()
        ->and(Schema::hasTable('building_amenity'))->toBeTrue()
        ->and(Schema::hasTable('unit_amenity'))->toBeTrue()
        ->and(class_uses_recursive(Amenity::class))->not->toContain(BelongsToTenant::class);
});

it('does not isolate amenities by tenant context', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();

    Amenity::factory()->create(['slug' => 'agua-quente', 'name' => 'Água quente']);
    Amenity::factory()->create(['slug' => 'piscina', 'name' => 'Piscina']);

    TenantContext::set($alpha->id);
    $alphaCount = Amenity::query()->count();

    TenantContext::set($beta->id);
    $betaCount = Amenity::query()->count();

    TenantContext::forget();

    expect($alphaCount)->toBe(2)
        ->and($betaCount)->toBe(2)
        ->and(Amenity::query()->count())->toBe(2);
});

it('rejects duplicate amenity slugs', function () {
    Amenity::factory()->create(['slug' => 'agua-quente']);

    Amenity::factory()->create(['slug' => 'agua-quente']);
})->throws(UniqueConstraintViolationException::class);

it('seeds amenities once and remains idempotent', function () {
    (new AmenitySeeder)->run();

    $firstCount = Amenity::query()->count();

    expect($firstCount)->toBe(count(AmenitySeeder::definitions()))
        ->and($firstCount)->toBeGreaterThan(0);

    (new AmenitySeeder)->run();

    expect(Amenity::query()->count())->toBe($firstCount);
});

it('lists all amenities for admin including inactive', function () {
    Amenity::factory()->create(['name' => 'Piscina', 'slug' => 'piscina', 'active' => true]);
    Amenity::factory()->inactive()->create(['name' => 'Gerador', 'slug' => 'gerador']);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/admin/amenities')
        ->assertOk()
        ->assertJsonCount(2)
        ->assertJsonPath('0.name', 'Gerador')
        ->assertJsonPath('1.name', 'Piscina');
});

it('creates an amenity as admin and slugs the name', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson('/api/admin/amenities', [
        'name' => 'Água quente',
    ])
        ->assertCreated()
        ->assertJsonPath('name', 'Água quente')
        ->assertJsonPath('slug', 'agua-quente')
        ->assertJsonPath('active', true);
});

it('rejects duplicate amenity slug on create', function () {
    Amenity::factory()->create(['slug' => 'agua-quente']);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson('/api/admin/amenities', [
        'name' => 'Água quente',
        'slug' => 'agua-quente',
    ])->assertUnprocessable();
});

it('updates amenity name and active flag', function () {
    $amenity = Amenity::factory()->create(['name' => 'Piscina', 'active' => true]);

    Sanctum::actingAs(User::factory()->admin()->create());

    $this->patchJson("/api/admin/amenities/{$amenity->id}", [
        'name' => 'Piscina aquecida',
        'active' => false,
    ])
        ->assertOk()
        ->assertJsonPath('name', 'Piscina aquecida')
        ->assertJsonPath('active', false)
        ->assertJsonPath('slug', $amenity->slug);
});

it('denies admin amenity routes to builder', function () {
    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->getJson('/api/admin/amenities')->assertForbidden();
});

it('lists only active amenities for the builder', function () {
    Amenity::factory()->create(['name' => 'Água quente', 'slug' => 'agua-quente']);
    Amenity::factory()->inactive()->create(['name' => 'Gerador', 'slug' => 'gerador']);

    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(User::factory()->builder()->withBuilderPermissions()->for($tenant)->create());

    $this->getJson('/api/builder/amenities')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.slug', 'agua-quente');
});

it('denies builder amenity catalog without buildings.view', function () {
    $tenant = Tenant::factory()->create();
    Sanctum::actingAs(
        User::factory()->builder()->withBuilderPermissions(['invites.send'])->for($tenant)->create(),
    );

    $this->getJson('/api/builder/amenities')->assertForbidden();
});

it('attaches amenities to building and unit pivots without removing the catalog', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create();
    $shared = Amenity::factory()->create(['slug' => 'agua-quente']);
    $extra = Amenity::factory()->create(['slug' => 'closet']);

    $building->amenities()->attach($shared);
    $unit->amenities()->attach([$shared->id, $extra->id]);

    expect($building->amenities()->pluck('amenities.id')->all())->toBe([$shared->id])
        ->and($unit->amenities()->pluck('amenities.id')->all())->toEqualCanonicalizing([$shared->id, $extra->id])
        ->and(Amenity::query()->count())->toBe(2);
});
