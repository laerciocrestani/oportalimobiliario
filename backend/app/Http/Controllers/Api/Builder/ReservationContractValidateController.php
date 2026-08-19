<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationContractCompletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RTL-022
 */
class ReservationContractValidateController extends Controller
{
    public function __construct(
        private readonly ReservationContractCompletionService $completionService,
    ) {}

    public function update(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('validateContract', $reservation);

        $request->validate([
            'gov_signed' => ['required', 'accepted'],
        ]);

        $updated = $this->completionService->validate($request->user(), $reservation);

        return response()->json([
            'status' => $updated->status->value,
            'unit_status' => $updated->unit?->status->value,
        ]);
    }
}
