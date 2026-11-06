<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ProposalSignatureService;
use App\Services\ReservationMessageReadService;
use App\Services\ReservationTimelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RTL-025
 * @see REQ-RKQ-002
 */
class ReservationTimelineController extends Controller
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
        private readonly ReservationMessageReadService $messageReadService,
        private readonly ProposalSignatureService $signatures,
    ) {}

    public function show(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('viewTimeline', $reservation);

        $this->messageReadService->markRead($reservation, $request->user());
        $this->signatures->syncProposalSignatures($reservation);

        return response()->json(
            $this->timelineService->build($reservation, $request->user()),
        );
    }
}
