<?php

namespace Database\Seeders;

use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\Tower;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    /**
     * @return array<string, list<array{code: string, tower: string, floor: int, area_m2: float, price: float, status: UnitStatus}>>
     */
    public static function definitions(): array
    {
        return [
            'Residencial Aurora' => [
                ['code' => '101', 'tower' => 'Torre única', 'floor' => 1, 'area_m2' => 72.5, 'price' => 450000, 'status' => UnitStatus::Available],
                ['code' => '102', 'tower' => 'Torre única', 'floor' => 1, 'area_m2' => 68.0, 'price' => 430000, 'status' => UnitStatus::PreReserved],
                ['code' => '201', 'tower' => 'Torre única', 'floor' => 2, 'area_m2' => 72.5, 'price' => 470000, 'status' => UnitStatus::Available],
                ['code' => '202', 'tower' => 'Torre única', 'floor' => 2, 'area_m2' => 85.0, 'price' => 520000, 'status' => UnitStatus::Sold],
                ['code' => '301', 'tower' => 'Torre única', 'floor' => 3, 'area_m2' => 72.5, 'price' => 490000, 'status' => UnitStatus::Unavailable],
            ],
            'Edifício Horizonte' => [
                ['code' => 'A-01', 'tower' => 'Torre única', 'floor' => 1, 'area_m2' => 55.0, 'price' => 380000, 'status' => UnitStatus::Available],
                ['code' => 'A-02', 'tower' => 'Torre única', 'floor' => 1, 'area_m2' => 55.0, 'price' => 385000, 'status' => UnitStatus::Available],
                ['code' => 'B-01', 'tower' => 'Torre única', 'floor' => 2, 'area_m2' => 62.0, 'price' => 410000, 'status' => UnitStatus::PreReserved],
            ],
            'Residencial Parque das Flores' => [
                ['code' => 'G-01', 'tower' => 'Torre única', 'floor' => 0, 'area_m2' => 95.0, 'price' => 620000, 'status' => UnitStatus::Available],
                ['code' => 'G-02', 'tower' => 'Torre única', 'floor' => 0, 'area_m2' => 98.0, 'price' => 640000, 'status' => UnitStatus::Reserved],
                ['code' => '101', 'tower' => 'Torre única', 'floor' => 1, 'area_m2' => 70.0, 'price' => 480000, 'status' => UnitStatus::Available],
                ['code' => '102', 'tower' => 'Torre única', 'floor' => 1, 'area_m2' => 74.0, 'price' => 495000, 'status' => UnitStatus::Sold],
            ],
            'Torre Vista Mar' => [
                ['code' => '1201', 'tower' => 'Torre A', 'floor' => 12, 'area_m2' => 110.0, 'price' => 980000, 'status' => UnitStatus::Available],
                ['code' => '1202', 'tower' => 'Torre A', 'floor' => 12, 'area_m2' => 115.0, 'price' => 1020000, 'status' => UnitStatus::Reserved],
                ['code' => '1501', 'tower' => 'Torre A', 'floor' => 15, 'area_m2' => 130.0, 'price' => 1250000, 'status' => UnitStatus::PreReserved],
                ['code' => '1801', 'tower' => 'Torre B', 'floor' => 18, 'area_m2' => 145.0, 'price' => 1480000, 'status' => UnitStatus::Sold],
                ['code' => '1201', 'tower' => 'Torre B', 'floor' => 12, 'area_m2' => 108.0, 'price' => 960000, 'status' => UnitStatus::Unavailable],
            ],
            'Condomínio Jardim Europa' => [
                ['code' => '501', 'tower' => 'Torre única', 'floor' => 5, 'area_m2' => 42.0, 'price' => 520000, 'status' => UnitStatus::Available],
                ['code' => '502', 'tower' => 'Torre única', 'floor' => 5, 'area_m2' => 48.0, 'price' => 580000, 'status' => UnitStatus::Available],
                ['code' => '601', 'tower' => 'Torre única', 'floor' => 6, 'area_m2' => 55.0, 'price' => 650000, 'status' => UnitStatus::Reserved],
            ],
            'Residencial Central Park' => [
                ['code' => '801', 'tower' => 'Torre única', 'floor' => 8, 'area_m2' => 65.0, 'price' => 420000, 'status' => UnitStatus::Available],
                ['code' => '802', 'tower' => 'Torre única', 'floor' => 8, 'area_m2' => 68.0, 'price' => 435000, 'status' => UnitStatus::Unavailable],
                ['code' => '901', 'tower' => 'Torre única', 'floor' => 9, 'area_m2' => 72.0, 'price' => 460000, 'status' => UnitStatus::Sold],
                ['code' => '902', 'tower' => 'Torre única', 'floor' => 9, 'area_m2' => 76.0, 'price' => 475000, 'status' => UnitStatus::Available],
            ],
            'Edifício Montanha Verde' => [
                ['code' => '301', 'tower' => 'Torre única', 'floor' => 3, 'area_m2' => 80.0, 'price' => 710000, 'status' => UnitStatus::Available],
                ['code' => '302', 'tower' => 'Torre única', 'floor' => 3, 'area_m2' => 82.0, 'price' => 725000, 'status' => UnitStatus::Available],
            ],
            'Residencial Bela Vista' => [
                ['code' => '1101', 'tower' => 'Torre única', 'floor' => 11, 'area_m2' => 58.0, 'price' => 390000, 'status' => UnitStatus::Available],
                ['code' => '1102', 'tower' => 'Torre única', 'floor' => 11, 'area_m2' => 60.0, 'price' => 405000, 'status' => UnitStatus::Reserved],
                ['code' => '1201', 'tower' => 'Torre única', 'floor' => 12, 'area_m2' => 63.0, 'price' => 420000, 'status' => UnitStatus::PreReserved],
            ],
            'Residencial Beta Norte' => [
                ['code' => '101', 'tower' => 'Torre única', 'floor' => 1, 'area_m2' => 66.0, 'price' => 360000, 'status' => UnitStatus::Available],
                ['code' => '102', 'tower' => 'Torre única', 'floor' => 1, 'area_m2' => 66.0, 'price' => 365000, 'status' => UnitStatus::Reserved],
                ['code' => '201', 'tower' => 'Torre única', 'floor' => 2, 'area_m2' => 70.0, 'price' => 385000, 'status' => UnitStatus::Available],
            ],
            'Residencial Beta Sul' => [
                ['code' => '401', 'tower' => 'Torre única', 'floor' => 4, 'area_m2' => 75.0, 'price' => 510000, 'status' => UnitStatus::Available],
                ['code' => '402', 'tower' => 'Torre única', 'floor' => 4, 'area_m2' => 78.0, 'price' => 530000, 'status' => UnitStatus::Available],
            ],
        ];
    }

    public function run(): void
    {
        foreach (self::definitions() as $buildingName => $units) {
            $building = Building::query()->where('name', $buildingName)->first();

            if ($building === null || $building->slug === WizardBuildingSeeder::SLUG || $building->wizard_completed_at !== null) {
                continue;
            }

            foreach ($units as $unit) {
                $tower = Tower::query()
                    ->where('building_id', $building->id)
                    ->where('name', $unit['tower'])
                    ->first();

                if ($tower === null) {
                    continue;
                }

                Unit::query()->updateOrCreate(
                    ['tower_id' => $tower->id, 'code' => $unit['code']],
                    [
                        'tenant_id' => $building->tenant_id,
                        'building_id' => $building->id,
                        'floor' => $unit['floor'],
                        'area_m2' => $unit['area_m2'],
                        'price' => $unit['price'],
                        'price_base' => $unit['price'],
                        'price_competence' => '2026-02-01',
                        'status' => $unit['status'],
                    ],
                );
            }
        }
    }
}
