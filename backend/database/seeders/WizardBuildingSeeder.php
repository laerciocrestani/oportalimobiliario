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
 * One demo building created through the wizard services (structure + unit-grid).
 *
 * @see REQ-WIZ-017
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
            'description' => 'Lançamento demo gerado pelo wizard, com preço-base em INCC-M e ficha completa das unidades.',
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
            ['name' => 'Torre A', 'floors_count' => 3],
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
            'wizard_step' => 4,
            'wizard_completed_at' => now(),
        ]);
    }

    /**
     * @return array{id: int, floors: list<array<string, mixed>>}
     */
    private function unitGrid(Tower $tower): array
    {
        $closetId = Amenity::query()->where('slug', 'closet')->value('id');

        return [
            'id' => $tower->id,
            'floors' => [
                [
                    'number' => 1,
                    'kind' => 'residential',
                    'units' => [
                        $this->typicalUnit('101', [
                            'price_base' => 480000,
                            'area_m2' => 72.5,
                            'total_area_m2' => 84.0,
                        ]),
                        $this->typicalUnit('102', [
                            'price_base' => 495000,
                            'area_m2' => 78.0,
                            'total_area_m2' => 90.0,
                            'bedrooms' => 3,
                            'suites' => 2,
                        ]),
                    ],
                ],
                [
                    'number' => 2,
                    'kind' => 'residential',
                    'units' => [
                        $this->typicalUnit('201', [
                            'price_base' => 510000,
                            'area_m2' => 72.5,
                            'total_area_m2' => 84.0,
                        ]),
                        $this->typicalUnit('202', [
                            'price_base' => 525000,
                            'area_m2' => 78.0,
                            'total_area_m2' => 90.0,
                            'bedrooms' => 3,
                            'suites' => 2,
                        ]),
                    ],
                ],
                [
                    'number' => 3,
                    'kind' => 'commercial',
                    'units' => [
                        $this->typicalUnit('301', [
                            'price_base' => 620000,
                            'area_m2' => 95.0,
                            'total_area_m2' => 110.0,
                            'bedrooms' => 0,
                            'bathrooms' => 2,
                            'suites' => 0,
                            'powder_rooms' => 1,
                            'balconies' => 0,
                            'property_position' => PropertyPosition::Front->value,
                            'amenity_ids' => $closetId === null ? [] : [$closetId],
                        ]),
                    ],
                ],
            ],
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
