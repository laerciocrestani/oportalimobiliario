<?php

use App\Enums\BuildingMediaCategory;
use App\Models\Building;
use App\Models\BuildingMedia;
use App\Models\Tenant;
use Database\Seeders\BuildingMediaSeeder;
use Database\Seeders\BuildingSeeder;
use Illuminate\Support\Facades\Storage;

it('seeds media for all buildings with sample files', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create(['slug' => 'construtora-alpha']);
    (new BuildingSeeder)->run();

    $publishedCount = Building::query()->where('tenant_id', $tenant->id)->where('published', true)->count();
    $draftCount = Building::query()->where('tenant_id', $tenant->id)->where('published', false)->count();

    (new BuildingMediaSeeder)->run();

    $expectedTotal = ($publishedCount * count(BuildingMediaSeeder::publishedBuildingMedia()))
        + ($draftCount * count(BuildingMediaSeeder::draftBuildingMedia()));

    expect(BuildingMedia::query()->count())->toBe($expectedTotal);

    $publishedBuilding = Building::query()
        ->where('tenant_id', $tenant->id)
        ->where('published', true)
        ->firstOrFail();

    $draftBuilding = Building::query()
        ->where('tenant_id', $tenant->id)
        ->where('published', false)
        ->firstOrFail();

    $publishedMedia = BuildingMedia::query()
        ->where('building_id', $publishedBuilding->id)
        ->get();

    expect($publishedMedia)->toHaveCount(count(BuildingMediaSeeder::publishedBuildingMedia()))
        ->and($publishedMedia->where('category', BuildingMediaCategory::Internal)->count())->toBe(3)
        ->and($publishedMedia->where('category', BuildingMediaCategory::External)->count())->toBe(3)
        ->and($publishedMedia->where('category', BuildingMediaCategory::FloorPlan)->count())->toBe(2)
        ->and($publishedMedia->where('published', true)->count())->toBe(4);

    $draftMedia = BuildingMedia::query()
        ->where('building_id', $draftBuilding->id)
        ->get();

    expect($draftMedia)->toHaveCount(count(BuildingMediaSeeder::draftBuildingMedia()))
        ->and($draftMedia->where('category', BuildingMediaCategory::FloorPlan)->count())->toBe(1);

    BuildingMedia::query()->each(function (BuildingMedia $media): void {
        Storage::disk('local')->assertExists($media->path);
        expect($media->size_bytes)->toBeGreaterThan(10_000);
    });
});

it('does not duplicate media when seeder runs twice', function () {
    Storage::fake('local');

    Tenant::factory()->create(['slug' => 'construtora-alpha']);
    (new BuildingSeeder)->run();

    (new BuildingMediaSeeder)->run();
    $firstCount = BuildingMedia::query()->count();

    (new BuildingMediaSeeder)->run();

    expect(BuildingMedia::query()->count())->toBe($firstCount);
});
