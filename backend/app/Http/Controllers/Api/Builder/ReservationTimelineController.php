<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationTimelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RTL-025
 */
class ReservationTimelineController extends Controller
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
    ) {}

    public function show(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('viewTimeline', $reservation);

        return response()->json(
            $this->timelineService->build($reservation, $request->user()),
        );
    }
}
