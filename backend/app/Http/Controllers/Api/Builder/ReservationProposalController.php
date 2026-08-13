<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\ProposalDecision;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationProposalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-RTL-008
 */
class ReservationProposalController extends Controller
{
    public function __construct(
        private readonly ReservationProposalService $proposalService,
    ) {}

    public function decide(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('decideProposal', $reservation);

        $data = $request->validate([
            'decision' => ['required', Rule::enum(ProposalDecision::class)],
            'decision_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $updated = $this->proposalService->decide(
            $request->user(),
            $reservation,
            ProposalDecision::from($data['decision']),
            $data['decision_note'] ?? null,
        );

        if (! $updated->exists) {
            return response()->json(['message' => 'Proposal rejected. Reservation cancelled.']);
        }

        return response()->json($this->formatReservation($updated));
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
            'client' => $reservation->client,
            'proposal' => $latestProposal?->toApiArray(),
        ];
    }
}
