<?php

namespace App\Policies;

use App\Enums\BuildingMediaCategory;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\BuildingMedia;
use App\Models\User;
use App\Policies\Concerns\AuthorizesBuilderTenant;
use App\Support\BuilderPermissions;

class BuildingMediaPolicy
{
    use AuthorizesBuilderTenant;

    public function viewAny(User $user, Building $building): bool
    {
        return $user->can(BuilderPermissions::MANAGE_BUILDINGS)
            && $this->sameTenant($user, $building);
    }

    public function view(User $user, BuildingMedia $media): bool
    {
        $media->loadMissing('building');

        if ($user->role === 'builder') {
            return $user->can(BuilderPermissions::MANAGE_BUILDINGS)
                && $this->sameTenant($user, $media->building);
        }

        if ($user->role === 'broker') {
            return $this->brokerHasBuildingAccess($user, $media->building_id);
        }

        return false;
    }

    public function create(User $user, Building $building): bool
    {
        return $user->can(BuilderPermissions::MANAGE_BUILDINGS)
            && $this->sameTenant($user, $building);
    }

    public function update(User $user, BuildingMedia $media): bool
    {
        $media->loadMissing('building');

        return $user->can(BuilderPermissions::MANAGE_BUILDINGS)
            && $this->sameTenant($user, $media->building);
    }

    public function delete(User $user, BuildingMedia $media): bool
    {
        return $this->update($user, $media);
    }

    public function viewBrokerAny(User $user, Building $building): bool
    {
        return $user->role === 'broker'
            && $this->brokerHasBuildingAccess($user, $building->id);
    }

    public function viewPublic(BuildingMedia $media): bool
    {
        return in_array($media->category, [
            BuildingMediaCategory::Internal,
            BuildingMediaCategory::External,
        ], true)
            && $media->published;
    }

    protected function brokerHasBuildingAccess(User $user, int $buildingId): bool
    {
        return BuildingAccess::query()
            ->withoutGlobalScope('tenant')
            ->where('broker_id', $user->id)
            ->where('building_id', $buildingId)
            ->exists();
    }
}
