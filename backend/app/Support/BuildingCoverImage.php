<?php

namespace App\Support;

use App\Models\BuildingMedia;

class BuildingCoverImage
{
    /**
     * @return array{id: int, url: string}|null
     */
    public static function serialize(?BuildingMedia $media, int $buildingId, string $prefix): ?array
    {
        if ($media === null) {
            return null;
        }

        return [
            'id' => $media->id,
            'url' => "{$prefix}/{$media->id}/file",
        ];
    }
}
