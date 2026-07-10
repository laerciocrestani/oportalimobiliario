<?php

/**
 * @see REQ-EMP-001
 */
use App\Enums\BuildingMediaCategory;
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\BuildingMedia;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Storage::fake('local');
});

it('uploads internal image for builder', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $file = UploadedFile::fake()->create('fachada.jpg', 100, 'image/jpeg');

    $this->post("/api/builder/buildings/{$building->id}/media", [
        'file' => $file,
        'category' => BuildingMediaCategory::Internal->value,
    ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('category', 'internal')
        ->assertJsonPath('published', false)
        ->assertJsonPath('mime_type', 'image/jpeg');

    expect(BuildingMedia::query()->count())->toBe(1);
    Storage::disk('local')->assertExists(BuildingMedia::query()->first()->path);
});

it('uploads external image and publishes on update', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->published()->create();

    Sanctum::actingAs($user);

    $file = UploadedFile::fake()->create('area-comum.png', 100, 'image/png');

    $response = $this->post("/api/builder/buildings/{$building->id}/media", [
        'file' => $file,
        'category' => BuildingMediaCategory::External->value,
    ], ['Accept' => 'application/json'])->assertCreated();

    $mediaId = $response->json('id');

    $this->patchJson("/api/builder/buildings/{$building->id}/media/{$mediaId}", [
        'published' => true,
    ])
        ->assertOk()
        ->assertJsonPath('published', true);

    $this->getJson("/api/public/buildings/{$building->slug}/media")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.category', 'external');
});

it('uploads floor plan as image and pdf', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs($user);

    $this->post("/api/builder/buildings/{$building->id}/media", [
        'file' => UploadedFile::fake()->create('planta.jpg', 100, 'image/jpeg'),
        'category' => BuildingMediaCategory::FloorPlan->value,
    ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('category', 'floor_plan')
        ->assertJsonPath('published', false);

    $this->post("/api/builder/buildings/{$building->id}/media", [
        'file' => UploadedFile::fake()->create('planta.pdf', 100, 'application/pdf'),
        'category' => BuildingMediaCategory::FloorPlan->value,
    ], ['Accept' => 'application/json'])
        ->assertCreated()
        ->assertJsonPath('mime_type', 'application/pdf');
});

it('rejects publishing floor plan', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $media = BuildingMedia::factory()->for($building)->floorPlan()->create();

    Sanctum::actingAs($user);

    $this->patchJson("/api/builder/buildings/{$building->id}/media/{$media->id}", [
        'published' => true,
    ])->assertStatus(422);
});

it('does not expose floor plans on public endpoint', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();

    BuildingMedia::factory()->for($building)->internal()->published()->create([
        'path' => 'buildings/1/1/public.jpg',
    ]);

    BuildingMedia::factory()->for($building)->floorPlan()->create([
        'path' => 'buildings/1/1/planta.pdf',
        'mime_type' => 'application/pdf',
        'published' => true,
    ]);

    Storage::disk('local')->put('buildings/1/1/public.jpg', 'public');
    Storage::disk('local')->put('buildings/1/1/planta.pdf', 'pdf');

    $this->getJson("/api/public/buildings/{$building->slug}/media")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.category', 'internal');
});

it('does not expose unpublished images on public endpoint', function () {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();

    BuildingMedia::factory()->for($building)->external()->create([
        'path' => 'buildings/1/1/private.jpg',
        'published' => false,
    ]);

    Storage::disk('local')->put('buildings/1/1/private.jpg', 'private');

    $this->getJson("/api/public/buildings/{$building->slug}/media")
        ->assertOk()
        ->assertJsonCount(0);
});

it('allows broker with building access to list media', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();

    BrokerTenant::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
    ]);

    BuildingAccess::factory()->create([
        'tenant_id' => $tenant->id,
        'broker_id' => $broker->id,
        'building_id' => $building->id,
    ]);

    BuildingMedia::factory()->for($building)->floorPlan()->create([
        'path' => 'buildings/1/1/planta.jpg',
    ]);

    Storage::disk('local')->put('buildings/1/1/planta.jpg', 'planta');

    Sanctum::actingAs($broker);

    $this->getJson("/api/broker/buildings/{$building->id}/media")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.category', 'floor_plan');
});

it('denies broker without building access', function () {
    $tenant = Tenant::factory()->create();
    $broker = User::factory()->broker()->create();
    $building = Building::factory()->for($tenant)->create();

    Sanctum::actingAs($broker);

    $this->getJson("/api/broker/buildings/{$building->id}/media")
        ->assertForbidden();
});

it('scopes builder media to tenant', function () {
    $alpha = Tenant::factory()->create();
    $beta = Tenant::factory()->create();
    $alphaUser = User::factory()->builder()->withBuilderPermissions()->for($alpha)->create();
    $betaBuilding = Building::factory()->for($beta)->create();

    Sanctum::actingAs($alphaUser);

    $this->getJson("/api/builder/buildings/{$betaBuilding->id}/media")
        ->assertNotFound();
});

it('deletes media and removes file from storage', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $media = BuildingMedia::factory()->for($building)->create([
        'path' => 'buildings/1/1/delete-me.jpg',
    ]);

    Storage::disk('local')->put($media->path, 'content');

    Sanctum::actingAs($user);

    $this->deleteJson("/api/builder/buildings/{$building->id}/media/{$media->id}")
        ->assertNoContent();

    expect(BuildingMedia::query()->count())->toBe(0);
    Storage::disk('local')->assertMissing($media->path);
});

it('streams media file for builder', function () {
    $tenant = Tenant::factory()->create();
    $user = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $building = Building::factory()->for($tenant)->create();
    $media = BuildingMedia::factory()->for($building)->create([
        'path' => 'buildings/1/1/stream.jpg',
        'mime_type' => 'image/jpeg',
    ]);

    Storage::disk('local')->put($media->path, 'image-bytes');

    Sanctum::actingAs($user);

    $this->get("/api/builder/buildings/{$building->id}/media/{$media->id}/file")
        ->assertOk()
        ->assertHeader('Content-Type', 'image/jpeg');
});
