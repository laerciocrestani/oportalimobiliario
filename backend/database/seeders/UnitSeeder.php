<?php

namespace Database\Seeders;

use App\Enums\UnitStatus;
use App\Models\Building;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    /**
     * @return array<string, list<array{code: string, floor: int, area_m2: float, price: float, status: UnitStatus}>>
     */
    public static function definitions(): array
    {
        return [
            'Residencial Aurora' => [
                ['code' => '101', 'floor' => 1, 'area_m2' => 72.5, 'price' => 450000, 'status' => UnitStatus::Available],
                ['code' => '102', 'floor' => 1, 'area_m2' => 68.0, 'price' => 430000, 'status' => UnitStatus::Reserved],
                ['code' => '201', 'floor' => 2, 'area_m2' => 72.5, 'price' => 470000, 'status' => UnitStatus::Available],
                ['code' => '202', 'floor' => 2, 'area_m2' => 85.0, 'price' => 520000, 'status' => UnitStatus::Sold],
                ['code' => '301', 'floor' => 3, 'area_m2' => 72.5, 'price' => 490000, 'status' => UnitStatus::Available],
            ],
            'Edifício Horizonte' => [
                ['code' => 'A-01', 'floor' => 1, 'area_m2' => 55.0, 'price' => 380000, 'status' => UnitStatus::Available],
                ['code' => 'A-02', 'floor' => 1, 'area_m2' => 55.0, 'price' => 385000, 'status' => UnitStatus::Available],
                ['code' => 'B-01', 'floor' => 2, 'area_m2' => 62.0, 'price' => 410000, 'status' => UnitStatus::Available],
            ],
            'Residencial Parque das Flores' => [
                ['code' => 'G-01', 'floor' => 0, 'area_m2' => 95.0, 'price' => 620000, 'status' => UnitStatus::Available],
                ['code' => 'G-02', 'floor' => 0, 'area_m2' => 98.0, 'price' => 640000, 'status' => UnitStatus::Reserved],
                ['code' => '101', 'floor' => 1, 'area_m2' => 70.0, 'price' => 480000, 'status' => UnitStatus::Available],
                ['code' => '102', 'floor' => 1, 'area_m2' => 74.0, 'price' => 495000, 'status' => UnitStatus::Sold],
            ],
            'Torre Vista Mar' => [
                ['code' => '1201', 'floor' => 12, 'area_m2' => 110.0, 'price' => 980000, 'status' => UnitStatus::Available],
                ['code' => '1202', 'floor' => 12, 'area_m2' => 115.0, 'price' => 1020000, 'status' => UnitStatus::Reserved],
                ['code' => '1501', 'floor' => 15, 'area_m2' => 130.0, 'price' => 1250000, 'status' => UnitStatus::Available],
                ['code' => '1801', 'floor' => 18, 'area_m2' => 145.0, 'price' => 1480000, 'status' => UnitStatus::Sold],
            ],
            'Condomínio Jardim Europa' => [
                ['code' => '501', 'floor' => 5, 'area_m2' => 42.0, 'price' => 520000, 'status' => UnitStatus::Available],
                ['code' => '502', 'floor' => 5, 'area_m2' => 48.0, 'price' => 580000, 'status' => UnitStatus::Available],
                ['code' => '601', 'floor' => 6, 'area_m2' => 55.0, 'price' => 650000, 'status' => UnitStatus::Reserved],
            ],
            'Residencial Central Park' => [
                ['code' => '801', 'floor' => 8, 'area_m2' => 65.0, 'price' => 420000, 'status' => UnitStatus::Available],
                ['code' => '802', 'floor' => 8, 'area_m2' => 68.0, 'price' => 435000, 'status' => UnitStatus::Available],
                ['code' => '901', 'floor' => 9, 'area_m2' => 72.0, 'price' => 460000, 'status' => UnitStatus::Sold],
                ['code' => '902', 'floor' => 9, 'area_m2' => 76.0, 'price' => 475000, 'status' => UnitStatus::Available],
            ],
            'Edifício Montanha Verde' => [
                ['code' => '301', 'floor' => 3, 'area_m2' => 80.0, 'price' => 710000, 'status' => UnitStatus::Available],
                ['code' => '302', 'floor' => 3, 'area_m2' => 82.0, 'price' => 725000, 'status' => UnitStatus::Available],
            ],
            'Residencial Bela Vista' => [
                ['code' => '1101', 'floor' => 11, 'area_m2' => 58.0, 'price' => 390000, 'status' => UnitStatus::Available],
                ['code' => '1102', 'floor' => 11, 'area_m2' => 60.0, 'price' => 405000, 'status' => UnitStatus::Reserved],
                ['code' => '1201', 'floor' => 12, 'area_m2' => 63.0, 'price' => 420000, 'status' => UnitStatus::Available],
            ],
            'Residencial Beta Norte' => [
                ['code' => '101', 'floor' => 1, 'area_m2' => 66.0, 'price' => 360000, 'status' => UnitStatus::Available],
                ['code' => '102', 'floor' => 1, 'area_m2' => 66.0, 'price' => 365000, 'status' => UnitStatus::Reserved],
                ['code' => '201', 'floor' => 2, 'area_m2' => 70.0, 'price' => 385000, 'status' => UnitStatus::Available],
            ],
            'Residencial Beta Sul' => [
                ['code' => '401', 'floor' => 4, 'area_m2' => 75.0, 'price' => 510000, 'status' => UnitStatus::Available],
                ['code' => '402', 'floor' => 4, 'area_m2' => 78.0, 'price' => 530000, 'status' => UnitStatus::Available],
            ],
        ];
    }

    public function run(): void
    {
        foreach (self::definitions() as $buildingName => $units) {
            $building = Building::query()->where('name', $buildingName)->first();

            if ($building === null) {
                continue;
            }

            foreach ($units as $unit) {
                Unit::query()->updateOrCreate(
                    ['building_id' => $building->id, 'code' => $unit['code']],
                    [
                        'tenant_id' => $building->tenant_id,
                        'floor' => $unit['floor'],
                        'area_m2' => $unit['area_m2'],
                        'price' => $unit['price'],
                        'status' => $unit['status'],
                    ],
                );
            }
        }
    }
}
