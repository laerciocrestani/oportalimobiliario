<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationDepositService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RTL-016
 */
class ReservationDepositController extends Controller
{
    public function __construct(
        private readonly ReservationDepositService $depositService,
    ) {}

    public function approve(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('approveDepositProof', $reservation);

        $updated = $this->depositService->approveProof($request->user(), $reservation);

        return response()->json([
            'status' => $updated->status->value,
        ]);
    }
}
