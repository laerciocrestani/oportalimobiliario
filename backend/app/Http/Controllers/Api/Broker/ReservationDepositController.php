<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationDepositService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RTL-015
 */
class ReservationDepositController extends Controller
{
    public function __construct(
        private readonly ReservationDepositService $depositService,
    ) {}

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'file' => ['required', 'file'],
        ]);

        $updated = $this->depositService->submitProof(
            $request->user(),
            $reservation,
            $validated['file'],
        );

        $attachment = $this->depositService->latestDepositProof($updated);
        $prefix = "/broker/reservations/{$updated->id}/attachments";

        return response()->json([
            'status' => $updated->status->value,
            'attachment' => $attachment?->toApiArray($prefix),
        ], 201);
    }
}
