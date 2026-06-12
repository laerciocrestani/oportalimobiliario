<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Unit;
use App\Services\ReservationPendingReplyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-BLD-RES-001
 * @see REQ-BLD-RES-002
 */
class ReservationController extends Controller
{
    public function __construct(
        private readonly ReservationPendingReplyService $reservationPendingReplyService,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Reservation::class);

        $user = request()->user();

        $reservations = Reservation::query()
            ->with(['client', 'broker', 'unit.building'])
            ->withCount('messages')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Reservation $reservation) => $this->reservationPendingReplyService->formatListItem($reservation, $user));

        return response()->json($reservations);
    }

    public function pendingRepliesCount(): JsonResponse
    {
        $this->authorize('viewAny', Reservation::class);

        return response()->json([
            'count' => $this->reservationPendingReplyService->countForBuilder(),
        ]);
    }

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
