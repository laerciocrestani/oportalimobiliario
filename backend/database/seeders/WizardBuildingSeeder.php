<?php

namespace Database\Seeders;

use App\Enums\CeilingType;
use App\Enums\FlooringType;
use App\Enums\OpeningType;
use App\Enums\PropertyPosition;
use App\Enums\SolarPosition;
use App\Enums\SunPeriod;
use App\Models\Amenity;
use App\Models\Building;
use App\Models\Tenant;
use App\Models\Tower;
use App\Services\AmenityAssignmentService;
use App\Services\BuildingStructureService;
use App\Services\BuildingUnitGridService;
use App\Tenancy\TenantContext;
use Illuminate\Database\Seeder;

/**
 * Demo building created through the wizard services (structure + unit-grid).
 *
 * @see REQ-WIZ-017
 * @see REQ-WZR-002
 * @see REQ-WZR-006
 * @see REQ-WZR-011
 */
class WizardBuildingSeeder extends Seeder
{
    public const SLUG = 'residencial-bosque';

    public const NAME = 'Residencial Bosque';

    public const PRICE_COMPETENCE = '2026-02-01';

    public function run(): void
    {
        $tenant = Tenant::query()->where('slug', 'construtora-alpha')->first();

        if ($tenant === null) {
            return;
        }

        $building = Building::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'slug' => self::SLUG],
            [
                'name' => self::NAME,
                'description' => 'Lançamento demo gerado pelo wizard, com preço-base em INCC-M.',
                'city' => 'São Paulo',
                'state' => 'SP',
                'published' => false,
                'wizard_step' => 1,
                'seo_title' => 'Residencial Bosque — Lançamento SP',
                'seo_description' => 'Empreendimento demo do wizard com preço corrigido pelo INCC-M.',
            ],
        );

        if ($building->published || $building->wizard_completed_at !== null) {
            return;
        }

        TenantContext::set($tenant->id);

        try {
            $this->seedDraft($building);
        } finally {
            TenantContext::forget();
        }
    }

    private function seedDraft(Building $building): void
    {
        $building->update([
            'name' => self::NAME,
            'zip' => '01310100',
            'street' => 'Avenida Paulista',
            'number' => '1578',
            'complement' => 'Térreo',
            'neighborhood' => 'Bela Vista',
            'city' => 'São Paulo',
            'state' => 'SP',
            'ceiling_type' => CeilingType::Plaster,
            'opening_type' => OpeningType::Aluminum,
            'flooring_type' => FlooringType::Porcelain,
            'solar_position' => SolarPosition::North,
            'sun_period' => SunPeriod::Morning,
            'description' => 'Lançamento demo gerado pelo wizard, com subsolo de garagem, lojas no térreo e andares clonados.',
            'seo_title' => 'Residencial Bosque — Lançamento SP',
            'seo_description' => 'Empreendimento demo do wizard com preço corrigido pelo INCC-M.',
            'wizard_step' => max((int) $building->wizard_step, 1),
        ]);

        app(AmenityAssignmentService::class)->syncBuilding(
            $building,
            Amenity::query()
                ->whereIn('slug', ['piscina', 'academia', 'agua-quente'])
                ->pluck('id')
                ->all(),
        );

        $building = app(BuildingStructureService::class)->replace($building, [
            [
                'name' => 'Torre A',
                'reference_floor' => 1,
                'floors' => [
                    ['number' => -1, 'kind' => 'garage'],
                    ['number' => 0, 'kind' => 'commercial'],
                    ['number' => 1, 'kind' => 'residential'],
                    ['number' => 2, 'kind' => 'residential'],
                    ['number' => 3, 'kind' => 'residential'],
                ],
            ],
        ]);

        $tower = $building->towers->first();

        if ($tower === null) {
            return;
        }

        app(BuildingUnitGridService::class)->replace($building, [
            $this->unitGrid($tower),
        ]);

        $building->update([
            'published' => true,
            'wizard_step' => 3,
            'wizard_completed_at' => now(),
        ]);
    }

    /**
     * @return array{id: int, reference_floor: int, floors: list<array<string, mixed>>}
     */
    private function unitGrid(Tower $tower): array
    {
        $closetId = Amenity::query()->where('slug', 'closet')->value('id');

        return [
            'id' => $tower->id,
            'reference_floor' => 1,
            'floors' => [
                [
                    'number' => -1,
                    'kind' => 'garage',
                    'customized' => false,
                    'units' => [
                        $this->garageSpot('S1-01', 12.5, 45000),
                        $this->garageSpot('S1-02', 13.0, 48000),
                    ],
                ],
                [
                    'number' => 0,
                    'kind' => 'commercial',
                    'customized' => false,
                    'units' => [
                        $this->shop('L01', 38.0, 210000),
                        $this->shop('L02', 42.0, 240000),
                    ],
                ],
                [
                    'number' => 1,
                    'kind' => 'residential',
                    'customized' => false,
                    'units' => $this->clonedApartments(1),
                ],
                [
                    'number' => 2,
                    'kind' => 'residential',
                    'customized' => false,
                    'units' => $this->clonedApartments(2, [
                        ['price_base' => 510000],
                        ['price_base' => 525000],
                    ]),
                ],
                [
                    'number' => 3,
                    'kind' => 'residential',
                    'customized' => true,
                    'units' => $this->clonedApartments(3, [
                        [
                            'price_base' => 620000,
                            'area_m2' => 95.0,
                            'total_area_m2' => 110.0,
                            'amenity_ids' => $closetId === null ? [] : [$closetId],
                        ],
                        ['price_base' => 540000],
                    ]),
                ],
            ],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $overrides
     * @return list<array<string, mixed>>
     */
    private function clonedApartments(int $floor, array $overrides = []): array
    {
        return [
            $this->typicalUnit("{$floor}01", $overrides[0] ?? []),
            $this->typicalUnit("{$floor}02", [
                'price_base' => 495000,
                'area_m2' => 78.0,
                'total_area_m2' => 90.0,
                'bedrooms' => 3,
                'suites' => 2,
                ...($overrides[1] ?? []),
            ]),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function garageSpot(string $code, float $area, float $priceBase): array
    {
        return [
            'code' => $code,
            'private_area_m2' => $area,
            'price_base' => $priceBase,
            'price_competence' => self::PRICE_COMPETENCE,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function shop(string $code, float $area, float $priceBase): array
    {
        return [
            'code' => $code,
            'price_base' => $priceBase,
            'price_competence' => self::PRICE_COMPETENCE,
            'area_m2' => $area,
            'total_area_m2' => $area,
            'bedrooms' => 0,
            'bathrooms' => 1,
            'suites' => 0,
            'powder_rooms' => 1,
            'balconies' => 0,
            'property_position' => PropertyPosition::Front->value,
        ];
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function typicalUnit(string $code, array $overrides = []): array
    {
        return [
            'code' => $code,
            'price_base' => 480000,
            'price_competence' => self::PRICE_COMPETENCE,
            'area_m2' => 72.5,
            'total_area_m2' => 84.0,
            'bedrooms' => 2,
            'bathrooms' => 2,
            'suites' => 1,
            'powder_rooms' => 0,
            'balconies' => 1,
            'property_position' => PropertyPosition::Front->value,
            ...$overrides,
        ];
    }
}
