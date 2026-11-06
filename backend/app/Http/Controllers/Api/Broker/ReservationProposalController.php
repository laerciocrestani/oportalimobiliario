<?php

namespace App\Http\Controllers\Api\Broker;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationTimelineEventType;
use App\Enums\SignatureSignerRole;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ProposalSignatureService;
use App\Services\ReservationProposalService;
use App\Support\ReservationProposalRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-RTL-005
 */
class ReservationProposalController extends Controller
{
    public function __construct(
        private readonly ReservationProposalService $proposalService,
        private readonly ProposalSignatureService $signatures,
    ) {}

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate(ReservationProposalRules::submit());
        $files = $data['files'] ?? [];
        unset($data['files']);

        $updated = $this->proposalService->submit($request->user(), $reservation, $data, $files);

        return response()->json($this->formatReservation($updated), 201);
    }

    public function resendSignatureLinks(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'notified' => $this->signatures->resendPendingLinks($reservation, $this->signatureRole($request)),
        ]);
    }

    public function returnSigned(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'signed_file' => ['required', 'file'],
            'deposit_proof' => ['prohibited'],
        ]);

        $updated = $this->proposalService->returnSigned(
            $request->user(),
            $reservation,
            $data['signed_file'],
        );

        return response()->json($this->formatReservation($updated));
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
        $reservation->loadMissing(['attachments', 'unit', 'proposals']);
        $latestProposal = $reservation->proposals()->latest('version')->first();
        $prefix = "/broker/reservations/{$reservation->id}/attachments";
        $event = $reservation->timelineEvents()
            ->where('type', ReservationTimelineEventType::ProposalSubmitted)
            ->latest('id')
            ->first();
        $ids = collect($event?->payload['attachment_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->all();

        $attachments = $reservation->attachments
            ->where('kind', ReservationAttachmentKind::Proposal)
            ->whereIn('id', $ids)
            ->sortBy('id')
            ->values()
            ->map(fn ($attachment) => $attachment->toApiArray($prefix))
            ->all();

        return [
            'id' => $reservation->id,
            'unit_id' => $reservation->unit_id,
            'broker_id' => $reservation->broker_id,
            'client_id' => $reservation->client_id,
            'status' => $reservation->status->value,
            'expires_at' => $reservation->expires_at,
            'draft_expires_at' => $reservation->draft_expires_at,
            'review_deadline_at' => $reservation->review_deadline_at,
            'unit' => $reservation->unit,
            'proposal' => $latestProposal === null ? null : [
                ...$latestProposal->toApiArray(),
                'attachments' => $attachments,
            ],
        ];
    }
}
