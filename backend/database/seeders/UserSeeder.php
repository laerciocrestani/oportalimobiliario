<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);

        $adminRole = Role::query()->where('name', 'admin')->first();
        $builderRole = Role::query()->where('name', 'builder')->first();
        $brokerRole = Role::query()->where('name', 'broker')->first();

        $systemTenant = Tenant::query()->firstOrCreate(
            ['slug' => 'system'],
            ['name' => 'System', 'active' => true],
        );

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@oportalimobiliario.com.br'],
            [
                'name' => 'Admin SaaS',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'tenant_id' => null,
            ],
        );
        $registrar->setPermissionsTeamId($systemTenant->id);
        $admin->syncRoles([$adminRole]);

        $alpha = Tenant::query()->where('slug', 'construtora-alpha')->first();
        $beta = Tenant::query()->where('slug', 'construtora-beta')->first();

        if ($alpha !== null) {
            $alphaUser = User::query()->firstOrCreate(
                ['email' => 'construtora@alpha.demo'],
                [
                    'name' => 'Construtora Alpha',
                    'password' => Hash::make('password'),
                    'role' => 'builder',
                    'tenant_id' => $alpha->id,
                ],
            );
            $registrar->setPermissionsTeamId($alpha->id);
            $alphaUser->syncRoles([$builderRole]);
            BuilderPermissions::assign($alphaUser, BuilderPermissions::all());

            User::query()->firstOrCreate(
                ['email' => 'comercial@alpha.demo'],
                [
                    'name' => 'Comercial Alpha',
                    'password' => Hash::make('password'),
                    'role' => 'builder',
                    'tenant_id' => $alpha->id,
                ],
            );
            $comercial = User::query()->where('email', 'comercial@alpha.demo')->first();
            BuilderPermissions::assign($comercial, [
                BuilderPermissions::VIEW_BUILDINGS,
                BuilderPermissions::SEND_INVITES,
            ]);

            User::query()->firstOrCreate(
                ['email' => 'supervisor@alpha.demo'],
                [
                    'name' => 'Supervisor Alpha',
                    'password' => Hash::make('password'),
                    'role' => 'builder',
                    'tenant_id' => $alpha->id,
                ],
            );
            $supervisor = User::query()->where('email', 'supervisor@alpha.demo')->first();
            BuilderPermissions::assign($supervisor, [
                BuilderPermissions::VIEW_BUILDINGS,
                BuilderPermissions::UPDATE_UNIT_STATUS,
                BuilderPermissions::CANCEL_RESERVATIONS,
            ]);
        }

        if ($beta !== null) {
            $betaUser = User::query()->firstOrCreate(
                ['email' => 'construtora@beta.demo'],
                [
                    'name' => 'Construtora Beta',
                    'password' => Hash::make('password'),
                    'role' => 'builder',
                    'tenant_id' => $beta->id,
                ],
            );
            $registrar->setPermissionsTeamId($beta->id);
            $betaUser->syncRoles([$builderRole]);
            BuilderPermissions::assign($betaUser, BuilderPermissions::all());
        }

        $broker = User::query()->firstOrCreate(
            ['email' => 'corretor@demo.com'],
            [
                'name' => 'Corretor Demo',
                'password' => Hash::make('password'),
                'role' => 'broker',
                'tenant_id' => null,
            ],
        );
        $registrar->setPermissionsTeamId($systemTenant->id);
        $broker->syncRoles([$brokerRole]);

        $registrar->setPermissionsTeamId(null);
    }
}
