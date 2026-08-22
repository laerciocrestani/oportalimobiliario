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
class ReservationContractSignedController extends Controller
{
    public function __construct(
        private readonly ReservationContractCompletionService $completionService,
    ) {}

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('uploadSignedContract', $reservation);

        $validated = $request->validate([
            'file' => ['required', 'file'],
        ]);

        $updated = $this->completionService->uploadBuilderSigned(
            $request->user(),
            $reservation,
            $validated['file'],
        );

        $attachment = $this->completionService->latestBuilderSignedContract($updated);
        $prefix = "/builder/reservations/{$updated->id}/attachments";

        return response()->json([
            'status' => $updated->status->value,
            'attachment' => $attachment?->toApiArray($prefix),
        ], 201);
    }
}
