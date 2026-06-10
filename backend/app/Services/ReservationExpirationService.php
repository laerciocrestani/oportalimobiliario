<?php

namespace App\Services;

use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Unit;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RES-002
 */
class ReservationExpirationService
{
    public function expireDueReservations(): int
    {
        $expired = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->where('expires_at', '<=', now())
            ->get();

        $count = 0;

        foreach ($expired as $reservation) {
            DB::transaction(function () use ($reservation, &$count) {
                $unit = Unit::query()
                    ->withoutGlobalScope('tenant')
                    ->lockForUpdate()
                    ->find($reservation->unit_id);

                if ($unit !== null && $unit->status === UnitStatus::Reserved) {
                    $unit->update(['status' => UnitStatus::Available]);
                }

                $reservation->delete();
                $count++;
            });
        }

        return $count;
    }
}
