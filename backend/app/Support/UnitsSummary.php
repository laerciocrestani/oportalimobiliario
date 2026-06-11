<?php

namespace App\Support;

use App\Enums\UnitStatus;
use Illuminate\Support\Collection;

class UnitsSummary
{
    /**
     * @return array{total: int, available: int, pre_reserved: int, reserved: int, sold: int, unavailable: int}
     */
    public static function empty(): array
    {
        return [
            'total' => 0,
            'available' => 0,
            'pre_reserved' => 0,
            'reserved' => 0,
            'sold' => 0,
            'unavailable' => 0,
        ];
    }

    /**
     * @param  Collection<string|UnitStatus, int|string>  $statusCounts
     * @return array{total: int, available: int, pre_reserved: int, reserved: int, sold: int, unavailable: int}
     */
    public static function fromCounts(Collection $statusCounts): array
    {
        $summary = self::empty();

        foreach ($statusCounts as $status => $count) {
            $key = $status instanceof UnitStatus ? $status->value : (string) $status;

            if (! array_key_exists($key, $summary)) {
                continue;
            }

            $summary[$key] = (int) $count;
            $summary['total'] += (int) $count;
        }

        return $summary;
    }
}
