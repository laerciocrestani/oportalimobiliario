<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationHoldService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RPF-006
 * @see REQ-RPF-007
 */
class ReservationHoldController extends Controller
{
    public function __construct(
        private readonly ReservationHoldService $holdService,
    ) {}

    public function extend(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('extendHold', $reservation);

        $data = $request->validate([
            'hours' => ['nullable', 'integer', 'min:1', 'max:168'],
        ]);

        $updated = $this->holdService->extend(
            $request->user(),
            $reservation,
            (int) ($data['hours'] ?? 48),
        );

        return response()->json([
            'status' => $updated->status->value,
            'expires_at' => $updated->expires_at?->toIso8601String(),
        ]);
    }

    public function drop(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('dropHold', $reservation);

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $this->holdService->drop(
            $request->user(),
            $reservation,
            $data['reason'] ?? null,
        );

        return response()->json(null, 204);
    }
}
