<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\Tower;
use Illuminate\Database\Seeder;

class TowerSeeder extends Seeder
{
    /**
     * @return array<string, list<array{name: string, sort_order: int}>>
     */
    public static function definitions(): array
    {
        return [
            'Torre Vista Mar' => [
                ['name' => 'Torre A', 'sort_order' => 0],
                ['name' => 'Torre B', 'sort_order' => 1],
            ],
        ];
    }

    public function run(): void
    {
        Building::query()->orderBy('id')->each(function (Building $building): void {
            if ($building->slug === WizardBuildingSeeder::SLUG || $building->wizard_completed_at !== null) {
                return;
            }

            $customTowers = self::definitions()[$building->name] ?? null;

            if ($customTowers !== null) {
                foreach ($customTowers as $tower) {
                    Tower::query()->firstOrCreate(
                        ['building_id' => $building->id, 'name' => $tower['name']],
                        [
                            'tenant_id' => $building->tenant_id,
                            'sort_order' => $tower['sort_order'],
                        ],
                    );
                }

                return;
            }

            Tower::query()->firstOrCreate(
                ['building_id' => $building->id, 'name' => 'Torre única'],
                [
                    'tenant_id' => $building->tenant_id,
                    'sort_order' => 0,
                ],
            );
        });
    }
}
