<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-TEAM-004
 */
class ReservationController extends Controller
{
    public function destroy(Reservation $reservation): JsonResponse
    {
        $this->authorize('cancel', $reservation);

        DB::transaction(function () use ($reservation) {
            $unit = Unit::query()
                ->lockForUpdate()
                ->findOrFail($reservation->unit_id);

            $unit->update(['status' => UnitStatus::Available]);
            $reservation->delete();
        });

        return response()->json(null, 204);
    }
}
