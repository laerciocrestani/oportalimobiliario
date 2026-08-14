<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationCancellationService;
use App\Services\ReservationPendingReplyService;
use App\Support\ReservationCancelRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-BLD-RES-001
 * @see REQ-BLD-RES-002
 * @see REQ-BLD-RES-003
 */
class ReservationController extends Controller
{
    public function __construct(
        private readonly ReservationCancellationService $cancellationService,
        private readonly ReservationPendingReplyService $reservationPendingReplyService,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Reservation::class);

        $user = request()->user();

        $reservations = Reservation::query()
            ->listed()
            ->with(['client', 'broker', 'unit.building', 'timelineEvents', 'messages', 'proposals'])
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

    public function destroy(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('cancel', $reservation);

        $data = $request->validate(ReservationCancelRules::payload());

        $this->cancellationService->cancel($request->user(), $reservation, $data['reason']);

        return response()->json(null, 204);
    }
}
