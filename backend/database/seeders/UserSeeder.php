<?php

namespace Database\Seeders;

use App\Enums\SignatureWitnessKind;
use App\Models\Tenant;
use App\Models\TenantSignatureSetting;
use App\Models\TenantSignatureWitnessSlot;
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
                    'phone' => '1130001001',
                ],
            );
            if ($alphaUser->phone === null) {
                $alphaUser->update(['phone' => '1130001001']);
            }
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
                BuilderPermissions::WITNESS,
            ]);

            $registrar->setPermissionsTeamId($alpha->id);
            $alcindo = $this->alphaMember($alpha->id, 'alcindoalpha@pidia.com.br', 'Alcindo André Alpha', '54999001001');
            $amalia = $this->alphaMember($alpha->id, 'amaliaabrantes@pidia.com.br', 'Amalia Abrantes', '54999001002');
            $erica = $this->alphaMember($alpha->id, 'ericasoldi@pidia.com.br', 'Erica Soldi', '54999001003');
            $alcindo->syncRoles([$builderRole]);
            $amalia->syncRoles([$builderRole]);
            $erica->syncRoles([$builderRole]);
            BuilderPermissions::assign($alcindo, [
                BuilderPermissions::VIEW_BUILDINGS,
                BuilderPermissions::CANCEL_RESERVATIONS,
            ]);
            BuilderPermissions::assign($amalia, [BuilderPermissions::WITNESS]);
            BuilderPermissions::assign($erica, [BuilderPermissions::WITNESS]);
            $this->alphaSignatures($alpha->id, $alcindo, $amalia, $erica);
        }

        if ($beta !== null) {
            $betaUser = User::query()->firstOrCreate(
                ['email' => 'construtora@beta.demo'],
                [
                    'name' => 'Construtora Beta',
                    'password' => Hash::make('password'),
                    'role' => 'builder',
                    'tenant_id' => $beta->id,
                    'phone' => '2130001002',
                ],
            );
            if ($betaUser->phone === null) {
                $betaUser->update(['phone' => '2130001002']);
            }
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
                'email_verified_at' => now(),
            ],
        );

        if ($broker->email_verified_at === null) {
            $broker->forceFill(['email_verified_at' => now()])->save();
        }
        $registrar->setPermissionsTeamId($systemTenant->id);
        $broker->syncRoles([$brokerRole]);

        $registrar->setPermissionsTeamId(null);
    }

    private function alphaMember(int $tenantId, string $email, string $name, string $phone): User
    {
        $user = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make('password'),
                'role' => 'builder',
                'tenant_id' => $tenantId,
                'phone' => $phone,
            ],
        );

        $user->update([
            'name' => $name,
            'role' => 'builder',
            'tenant_id' => $tenantId,
            'phone' => $user->phone ?: $phone,
        ]);

        return $user->fresh();
    }

    private function alphaSignatures(int $tenantId, User $signer, User $firstWitness, User $secondWitness): void
    {
        $setting = TenantSignatureSetting::query()->withoutGlobalScope('tenant')->updateOrCreate(
            ['tenant_id' => $tenantId],
            ['proposal_signer_user_id' => $signer->id],
        );

        TenantSignatureWitnessSlot::query()
            ->withoutGlobalScope('tenant')
            ->where('signature_setting_id', $setting->id)
            ->delete();

        foreach ([[1, $firstWitness], [2, $secondWitness]] as [$position, $witness]) {
            TenantSignatureWitnessSlot::query()->withoutGlobalScope('tenant')->create([
                'tenant_id' => $tenantId,
                'signature_setting_id' => $setting->id,
                'position' => $position,
                'kind' => SignatureWitnessKind::TeamUser,
                'user_id' => $witness->id,
            ]);
        }
    }
}
