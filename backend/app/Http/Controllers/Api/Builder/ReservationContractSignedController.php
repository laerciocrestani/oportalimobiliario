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
            'witness_1_user_id' => ['required', 'integer', 'exists:users,id'],
            'witness_2_user_id' => ['required', 'integer', 'exists:users,id', 'different:witness_1_user_id'],
        ]);

        $updated = $this->completionService->uploadBuilderSigned(
            $request->user(),
            $reservation,
            $validated['file'],
            (int) $validated['witness_1_user_id'],
            (int) $validated['witness_2_user_id'],
        );

        $attachment = $this->completionService->latestBuilderSignedContract($updated);
        $prefix = "/builder/reservations/{$updated->id}/attachments";

        return response()->json([
            'status' => $updated->status->value,
            'attachment' => $attachment?->toApiArray($prefix),
        ], 201);
    }
}
