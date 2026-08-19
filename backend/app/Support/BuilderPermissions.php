<?php

namespace App\Support;

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class BuilderPermissions
{
    public const VIEW_BUILDINGS = 'buildings.view';

    public const MANAGE_BUILDINGS = 'buildings.manage';

    public const MANAGE_UNITS = 'units.manage';

    public const UPDATE_UNIT_STATUS = 'units.update_status';

    public const SEND_INVITES = 'invites.send';

    public const MANAGE_ACCESS = 'access.manage';

    public const CANCEL_RESERVATIONS = 'reservations.cancel';

    public const MANAGE_TEAM = 'team.manage';

    public const MANAGE_CONTRACTS = 'contracts.manage';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::VIEW_BUILDINGS,
            self::MANAGE_BUILDINGS,
            self::MANAGE_UNITS,
            self::UPDATE_UNIT_STATUS,
            self::SEND_INVITES,
            self::MANAGE_ACCESS,
            self::CANCEL_RESERVATIONS,
            self::MANAGE_TEAM,
            self::MANAGE_CONTRACTS,
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::VIEW_BUILDINGS => 'Ver empreendimentos',
            self::MANAGE_BUILDINGS => 'Gerenciar empreendimentos e torres',
            self::MANAGE_UNITS => 'Gerenciar unidades',
            self::UPDATE_UNIT_STATUS => 'Alterar status de unidades',
            self::SEND_INVITES => 'Convidar corretores',
            self::MANAGE_ACCESS => 'Gerenciar acesso de corretores',
            self::CANCEL_RESERVATIONS => 'Cancelar reservas',
            self::MANAGE_TEAM => 'Gerenciar equipe',
            self::MANAGE_CONTRACTS => 'Gerenciar contratos',
        ];
    }

    public static function seed(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::all() as $name) {
            Permission::query()->firstOrCreate([
                'name' => $name,
                'guard_name' => 'web',
            ]);
        }
    }

    /**
     * @param  list<string>  $permissions
     */
    public static function assign(User $user, array $permissions): void
    {
        self::seed();

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($user->tenant_id);
        $user->syncPermissions($permissions);
        $registrar->setPermissionsTeamId(null);
    }

    /**
     * @return list<string>
     */
    public static function namesFor(User $user): array
    {
        if ($user->tenant_id === null) {
            return [];
        }

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($user->tenant_id);

        $names = $user->getPermissionNames()->values()->all();

        $registrar->setPermissionsTeamId(null);

        return $names;
    }

    public static function countTeamManagers(int $tenantId, ?int $excludeUserId = null): int
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($tenantId);

        $count = User::query()
            ->where('tenant_id', $tenantId)
            ->where('role', 'builder')
            ->when($excludeUserId !== null, fn ($query) => $query->where('id', '!=', $excludeUserId))
            ->get()
            ->filter(fn (User $user) => $user->hasPermissionTo(self::MANAGE_TEAM))
            ->count();

        $registrar->setPermissionsTeamId(null);

        return $count;
    }
}
