<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationContractCompletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RTL-020
 * @see REQ-RTL-021
 */
class ReservationContractSignedController extends Controller
{
    public function __construct(
        private readonly ReservationContractCompletionService $completionService,
    ) {}

    public function gov(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $updated = $this->completionService->markSignedGov(
            $request->user(),
            $reservation,
            $data['note'] ?? null,
        );

        return response()->json([
            'status' => $updated->status->value,
        ]);
    }

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'file' => ['required', 'file'],
        ]);

        $updated = $this->completionService->uploadSigned(
            $request->user(),
            $reservation,
            $validated['file'],
        );

        $attachment = $this->completionService->latestSignedContract($updated);
        $prefix = "/broker/reservations/{$updated->id}/attachments";

        return response()->json([
            'status' => $updated->status->value,
            'attachment' => $attachment?->toApiArray($prefix),
        ], 201);
    }
}
