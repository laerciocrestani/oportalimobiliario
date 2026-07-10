<?php

namespace App\Support;

use App\Models\Building;
use Illuminate\Support\Str;

class BuildingSlug
{
    public static function generateUnique(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        $base = $base !== '' ? $base : 'empreendimento';
        $slug = $base;
        $suffix = 2;

        while (self::exists($slug, $ignoreId)) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    public static function exists(string $slug, ?int $ignoreId = null): bool
    {
        return Building::query()
            ->when($ignoreId !== null, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->where('slug', $slug)
            ->exists();
    }
}
