<?php

namespace App\Models\Concerns;

use App\Enums\UnitStatus;
use App\Support\UnitsSummary;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait ComputesUnitsSummary
{
    /**
     * @return array{total: int, available: int, pre_reserved: int, reserved: int, sold: int, unavailable: int}
     */
    public function computeUnitsSummary(): array
    {
        /** @var HasMany $relation */
        $relation = $this->units();

        $counts = $relation
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row) => [
                $row->status instanceof UnitStatus ? $row->status->value : (string) $row->status => (int) $row->aggregate,
            ]);

        return UnitsSummary::fromCounts($counts);
    }
}
