<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\ProposalDecision;
use App\Enums\SignatureSignerRole;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ProposalReviewService;
use App\Services\ProposalSignatureService;
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
        private readonly ProposalReviewService $reviewService,
        private readonly ProposalSignatureService $signatures,
    ) {}

    public function decide(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('decideProposal', $reservation);

        $data = $request->validate([
            'decision' => ['required', Rule::enum(ProposalDecision::class)],
            'decision_note' => [
                Rule::requiredIf(in_array($request->input('decision'), [
                    ProposalDecision::Rejected->value,
                    ProposalDecision::Returned->value,
                ], true)),
                'nullable',
                'string',
                'max:2000',
            ],
            'signed_file' => ['nullable', 'file'],
        ]);

        $decision = ProposalDecision::from($data['decision']);
        $note = isset($data['decision_note']) && is_string($data['decision_note'])
            ? trim($data['decision_note'])
            : null;

        $updated = $this->proposalService->decide(
            $request->user(),
            $reservation,
            $decision,
            $note === '' ? null : $note,
            $data['signed_file'] ?? null,
        );

        return response()->json($this->formatReservation($updated));
    }

    public function resendSignatureLinks(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('decideProposal', $reservation);

        return response()->json([
            'notified' => $this->signatures->resendPendingLinks($reservation, $this->signatureRole($request)),
        ]);
    }

    public function extend(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('decideProposal', $reservation);

        $data = $request->validate([
            'hours' => ['required', 'integer', 'min:1', 'max:168'],
        ]);

        $updated = $this->reviewService->extend($request->user(), $reservation, $data['hours']);

        return response()->json([
            'id' => $updated->id,
            'status' => $updated->status->value,
            'review_deadline_at' => $updated->review_deadline_at,
        ]);
    }

    private function signatureRole(Request $request): ?SignatureSignerRole
    {
        $data = $request->validate([
            'role' => ['sometimes', 'string', Rule::in([
                SignatureSignerRole::Builder->value,
                SignatureSignerRole::Broker->value,
                SignatureSignerRole::Buyer->value,
            ])],
        ]);

        return isset($data['role']) ? SignatureSignerRole::from($data['role']) : null;
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
