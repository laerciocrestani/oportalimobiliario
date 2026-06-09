<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::query()->where('name', 'admin')->first();
        $construtoraRole = Role::query()->where('name', 'construtora')->first();
        $corretorRole = Role::query()->where('name', 'corretor')->first();

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@oportalimobiliario.com.br'],
            [
                'name' => 'Admin SaaS',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'tenant_id' => null,
            ],
        );
        $admin->syncRoles([$adminRole]);

        $alpha = Tenant::query()->where('slug', 'construtora-alpha')->first();
        $beta = Tenant::query()->where('slug', 'construtora-beta')->first();

        if ($alpha !== null) {
            $alphaUser = User::query()->firstOrCreate(
                ['email' => 'construtora@alpha.demo'],
                [
                    'name' => 'Construtora Alpha',
                    'password' => Hash::make('password'),
                    'role' => 'construtora',
                    'tenant_id' => $alpha->id,
                ],
            );
            $alphaUser->syncRoles([$construtoraRole]);
        }

        if ($beta !== null) {
            $betaUser = User::query()->firstOrCreate(
                ['email' => 'construtora@beta.demo'],
                [
                    'name' => 'Construtora Beta',
                    'password' => Hash::make('password'),
                    'role' => 'construtora',
                    'tenant_id' => $beta->id,
                ],
            );
            $betaUser->syncRoles([$construtoraRole]);
        }

        $corretor = User::query()->firstOrCreate(
            ['email' => 'corretor@demo.com'],
            [
                'name' => 'Corretor Demo',
                'password' => Hash::make('password'),
                'role' => 'corretor',
                'tenant_id' => null,
            ],
        );
        $corretor->syncRoles([$corretorRole]);
    }
}
