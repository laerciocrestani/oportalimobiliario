<?php

namespace App\Enums;

enum BuildingMediaCategory: string
{
    case Internal = 'internal';
    case External = 'external';
    case FloorPlan = 'floor_plan';

    /**
     * @return list<string>
     */
    public static function publicCategories(): array
    {
        return [
            self::Internal->value,
            self::External->value,
        ];
    }

    public function isPublicPublishable(): bool
    {
        return $this !== self::FloorPlan;
    }
}
