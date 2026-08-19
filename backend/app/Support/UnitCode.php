<?php

namespace App\Support;

final class UnitCode
{
    public static function fromFloorPosition(int $floor, int $position): string
    {
        return sprintf('%d%02d', $floor, $position);
    }
}
