<?php

namespace Database\Seeders;

use App\Enums\UnitStatus;
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\InccIndex;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Database\Seeder;

/**
 * Dados só do run de Playwright. Não entra no DatabaseSeeder nem no Postgres de desenvolvimento.
 */
class E2eSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        $tenant = Tenant::factory()->create([
            'name' => 'Construtora E2E',
            'slug' => 'construtora-e2e',
        ]);

        User::factory()->builder()->withBuilderPermissions()->create([
            'name' => 'Gestora E2E',
            'email' => 'construtora@e2e.test',
            'tenant_id' => $tenant->id,
        ]);

        $broker = User::factory()->broker()->create([
            'name' => 'Corretor E2E',
            'email' => 'corretor@e2e.test',
        ]);

        BrokerTenant::factory()->create([
            'tenant_id' => $tenant->id,
            'broker_id' => $broker->id,
            'approved_at' => now(),
        ]);

        $building = Building::factory()->published()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Residencial E2E',
            'slug' => 'residencial-e2e',
            'description' => 'Empreendimento publicado para a jornada pública.',
            'city' => 'São Paulo',
            'state' => 'SP',
        ]);

        BuildingAccess::factory()->create([
            'tenant_id' => $tenant->id,
            'broker_id' => $broker->id,
            'building_id' => $building->id,
        ]);

        Unit::factory()->create([
            'tenant_id' => $tenant->id,
            'building_id' => $building->id,
            'code' => '101',
            'floor' => 1,
            'status' => UnitStatus::Available,
            'price' => 450000,
            'price_base' => 450000,
            'price_competence' => '2026-02-01',
        ]);

        InccIndex::factory()->manual()->create([
            'competence' => '2026-02-01',
            'value' => 1000,
        ]);
    }
}
