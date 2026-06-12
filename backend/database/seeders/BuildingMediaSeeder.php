<?php

namespace Database\Seeders;

use App\Enums\BuildingMediaCategory;
use App\Models\Building;
use App\Models\BuildingMedia;
use Database\Seeders\Support\BuildingMediaSamples;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BuildingMediaSeeder extends Seeder
{
    /**
     * @return list<array{
     *     original_name: string,
     *     category: BuildingMediaCategory,
     *     published: bool,
     *     sort_order: int,
     *     sample_number: string
     * }>
     */
    public static function publishedBuildingMedia(): array
    {
        return [
            [
                'original_name' => 'sala-estar.jpg',
                'category' => BuildingMediaCategory::Internal,
                'published' => true,
                'sort_order' => 0,
                'sample_number' => '01',
            ],
            [
                'original_name' => 'cozinha.jpg',
                'category' => BuildingMediaCategory::Internal,
                'published' => true,
                'sort_order' => 1,
                'sample_number' => '02',
            ],
            [
                'original_name' => 'suite-master.jpg',
                'category' => BuildingMediaCategory::Internal,
                'published' => false,
                'sort_order' => 2,
                'sample_number' => '03',
            ],
            [
                'original_name' => 'fachada.jpg',
                'category' => BuildingMediaCategory::External,
                'published' => true,
                'sort_order' => 0,
                'sample_number' => '04',
            ],
            [
                'original_name' => 'area-lazer.jpg',
                'category' => BuildingMediaCategory::External,
                'published' => true,
                'sort_order' => 1,
                'sample_number' => '05',
            ],
            [
                'original_name' => 'vista-externa.jpg',
                'category' => BuildingMediaCategory::External,
                'published' => false,
                'sort_order' => 2,
                'sample_number' => '06',
            ],
            [
                'original_name' => 'planta-2-dormitorios.jpg',
                'category' => BuildingMediaCategory::FloorPlan,
                'published' => false,
                'sort_order' => 0,
                'sample_number' => '07',
            ],
            [
                'original_name' => 'planta-3-dormitorios.png',
                'category' => BuildingMediaCategory::FloorPlan,
                'published' => false,
                'sort_order' => 1,
                'sample_number' => '08',
            ],
        ];
    }

    /**
     * @return list<array{
     *     original_name: string,
     *     category: BuildingMediaCategory,
     *     published: bool,
     *     sort_order: int,
     *     sample_number: string
     * }>
     */
    public static function draftBuildingMedia(): array
    {
        return [
            [
                'original_name' => 'rascunho-interno.jpg',
                'category' => BuildingMediaCategory::Internal,
                'published' => false,
                'sort_order' => 0,
                'sample_number' => '09',
            ],
            [
                'original_name' => 'planta-preliminar.jpg',
                'category' => BuildingMediaCategory::FloorPlan,
                'published' => false,
                'sort_order' => 0,
                'sample_number' => '10',
            ],
        ];
    }

    public function run(): void
    {
        Building::query()->orderBy('id')->each(function (Building $building): void {
            $definitions = $building->published
                ? self::publishedBuildingMedia()
                : self::draftBuildingMedia();

            foreach ($definitions as $definition) {
                $existing = BuildingMedia::query()
                    ->where('building_id', $building->id)
                    ->where('original_name', $definition['original_name'])
                    ->first();

                if ($existing !== null) {
                    continue;
                }

                $sampleNumber = $definition['sample_number'];
                $content = BuildingMediaSamples::contents($sampleNumber);
                $extension = BuildingMediaSamples::extension($sampleNumber);

                $path = sprintf(
                    'buildings/%d/%d/%s.%s',
                    $building->tenant_id,
                    $building->id,
                    Str::uuid(),
                    $extension,
                );

                Storage::disk('local')->put($path, $content);

                BuildingMedia::query()->create([
                    'building_id' => $building->id,
                    'category' => $definition['category'],
                    'path' => $path,
                    'original_name' => $definition['original_name'],
                    'mime_type' => BuildingMediaSamples::mimeType($sampleNumber),
                    'size_bytes' => strlen($content),
                    'published' => $definition['published'],
                    'sort_order' => $definition['sort_order'],
                ]);
            }
        });
    }
}
