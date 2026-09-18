<?php

namespace App\Support;

final class UnitCode
{
    public static function fromFloorPosition(int $floor, int $position): string
    {
        if ($floor < 0) {
            return sprintf('S%d-%02d', abs($floor), $position);
        }

        if ($floor === 0) {
            return sprintf('L%02d', $position);
        }

        return sprintf('%d%02d', $floor, $position);
    }
}
