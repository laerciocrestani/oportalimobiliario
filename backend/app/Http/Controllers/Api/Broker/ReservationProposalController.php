<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationProposalService;
use App\Support\ReservationProposalRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RTL-005
 */
class ReservationProposalController extends Controller
{
    public function __construct(
        private readonly ReservationProposalService $proposalService,
    ) {}

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate(ReservationProposalRules::submit());

        $updated = $this->proposalService->submit($request->user(), $reservation, $data);

        return response()->json($this->formatReservation($updated), 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatReservation(Reservation $reservation): array
    {
        $latestProposal = $reservation->proposals()->latest('version')->first();

        return [
            'id' => $reservation->id,
            'unit_id' => $reservation->unit_id,
            'broker_id' => $reservation->broker_id,
            'client_id' => $reservation->client_id,
            'status' => $reservation->status->value,
            'expires_at' => $reservation->expires_at,
            'unit' => $reservation->unit,
            'proposal' => $latestProposal?->toApiArray(),
        ];
    }
}
