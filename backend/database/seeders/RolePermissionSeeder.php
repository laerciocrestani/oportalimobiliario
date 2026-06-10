<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['admin', 'builder', 'broker'] as $role) {
            Role::query()->firstOrCreate([
                'name' => $role,
                'guard_name' => 'web',
                'tenant_id' => null,
            ]);
        }
    }
}
