<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationContractCompletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RPF-013
 * @see REQ-RPF-014
 */
class ReservationWitnessController extends Controller
{
    public function __construct(
        private readonly ReservationContractCompletionService $completionService,
    ) {}

    public function candidates(Reservation $reservation): JsonResponse
    {
        $this->authorize('assignWitnesses', $reservation);

        return response()->json($this->completionService->witnessCandidates($reservation));
    }

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('assignWitnesses', $reservation);

        $data = $request->validate([
            'witness_1_user_id' => ['required', 'integer', 'exists:users,id'],
            'witness_2_user_id' => ['required', 'integer', 'exists:users,id', 'different:witness_1_user_id'],
        ]);

        $updated = $this->completionService->assignWitnesses(
            $request->user(),
            $reservation,
            (int) $data['witness_1_user_id'],
            (int) $data['witness_2_user_id'],
        );

        return response()->json([
            'status' => $updated->status->value,
            'witnesses' => $updated->witnesses
                ->sortBy('slot')
                ->values()
                ->map(fn ($witness) => $witness->toApiArray($request->user()))
                ->all(),
        ]);
    }

    public function sign(Request $request, Reservation $reservation, int $slot): JsonResponse
    {
        $this->authorize('signAsWitness', $reservation);

        $updated = $this->completionService->signAsWitness(
            $request->user(),
            $reservation,
            $slot,
        );

        return response()->json([
            'status' => $updated->status->value,
            'witnesses' => $updated->witnesses
                ->sortBy('slot')
                ->values()
                ->map(fn ($witness) => $witness->toApiArray($request->user()))
                ->all(),
        ]);
    }
}
