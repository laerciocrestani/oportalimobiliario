<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationCancellationService;
use App\Services\ReservationPendingReplyService;
use App\Support\ReservationCancelRules;
use App\Support\BuilderPermissions;
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
        $this->authorize('viewAny', Reservation::class);

        $reservations = Reservation::query()
            ->listed()
            ->when(
                ! $user->can(BuilderPermissions::CANCEL_RESERVATIONS),
                fn ($query) => $query->whereHas(
                    'witnesses',
                    fn ($witnesses) => $witnesses->where('user_id', $user->id),
                ),
            )
            ->with(['client', 'broker', 'unit.building', 'timelineEvents', 'messages.user', 'proposals', 'attachments', 'witnesses'])
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
            'count' => $this->reservationPendingReplyService->pendingActionCountForBuilder(request()->user()),
        ]);
    }

    public function pendingActionsCount(): JsonResponse
    {
        $user = request()->user();

        return response()->json(
            $this->reservationPendingReplyService->pendingActionPayloadForBuilder($user),
        );
    }

    public function destroy(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('cancel', $reservation);

        $data = $request->validate(ReservationCancelRules::payload());

        $this->cancellationService->cancel($request->user(), $reservation, $data['reason']);

        return response()->json(null, 204);
    }
}
