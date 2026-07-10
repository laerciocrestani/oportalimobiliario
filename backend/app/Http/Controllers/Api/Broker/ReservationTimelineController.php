<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationTimelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RTL-024
 */
class ReservationTimelineController extends Controller
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
    ) {}

    public function show(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json(
            $this->timelineService->build($reservation, $request->user()),
        );
    }
}
