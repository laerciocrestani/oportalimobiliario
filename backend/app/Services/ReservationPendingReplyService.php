<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Models\Reservation;
use App\Models\ReservationMessage;
use App\Models\ReservationTimelineEvent;
use App\Models\ReservationWitness;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RGS-002
 */
class ReservationPendingReplyService
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
        private readonly ReservationKanbanService $kanbanService,
        private readonly ReservationMessageReadService $messageReadService,
    ) {}

    public function needsReplyFromUser(Reservation $reservation, User $user): bool
    {
        if ($reservation->isReadOnly()) {
            return false;
        }

        $latestMessage = $this->latestMessage($reservation);

        if ($latestMessage === null || $latestMessage->user === null) {
            return false;
        }

        return $latestMessage->user->role !== $user->role;
    }

    public function countForBuilder(): int
    {
        return $this->countWhereLatestMessageFromRole(
            Reservation::query()->listed()->where('status', '!=', ReservationStatus::Cancelled),
            'broker',
        );
    }

    public function countForBroker(User $broker): int
    {
        return $this->countWhereLatestMessageFromRole(
            Reservation::query()
                ->withoutGlobalScope('tenant')
                ->listed()
                ->where('status', '!=', ReservationStatus::Cancelled)
                ->where('broker_id', $broker->id),
            'builder',
        );
    }

    public function pendingActionCountForBuilder(User $builder): int
    {
        return $this->pendingActionPayloadForBuilder($builder)['count'];
    }

    public function pendingActionCountForBroker(User $broker): int
    {
        return $this->pendingActionPayloadForBroker($broker)['count'];
    }

    /**
     * @return array{count: int, witness_scope: bool}
     */
    public function pendingActionPayloadForBuilder(User $builder): array
    {
        $isManager = $builder->can(BuilderPermissions::CANCEL_RESERVATIONS);
        $witnessReservationIds = ReservationWitness::query()
            ->where('user_id', $builder->id)
            ->pluck('reservation_id');

        $query = Reservation::query()
            ->listed()
            ->where('status', '!=', ReservationStatus::Cancelled)
            ->when(
                ! $isManager,
                fn (Builder $builderQuery) => $builderQuery->whereIn('id', $witnessReservationIds),
            );

        $reservations = $query
            ->with(['messages.user:id,role', 'timelineEvents', 'attachments', 'witnesses', 'proposals'])
            ->get();

        $count = $reservations
            ->filter(fn (Reservation $reservation) => $this->pendingActionFor($reservation, $builder) !== null)
            ->count();

        return [
            'count' => $count,
            'witness_scope' => $witnessReservationIds->isNotEmpty(),
        ];
    }

    /**
     * @return array{count: int, witness_scope: bool}
     */
    public function pendingActionPayloadForBroker(User $broker): array
    {
        $reservations = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->listed()
            ->where('status', '!=', ReservationStatus::Cancelled)
            ->where('broker_id', $broker->id)
            ->with(['messages.user:id,role', 'timelineEvents', 'attachments', 'witnesses', 'proposals'])
            ->get();

        return [
            'count' => $reservations
                ->filter(fn (Reservation $reservation) => $this->pendingActionFor($reservation, $broker) !== null)
                ->count(),
            'witness_scope' => false,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function formatListItem(Reservation $reservation, User $viewer): array
    {
        $isManager = $viewer->role === 'builder' && $viewer->can(BuilderPermissions::CANCEL_RESERVATIONS);
        $pendingAction = $this->pendingActionFor($reservation, $viewer);
        $needsWitnessSignature = $pendingAction === 'witness_signature';
        $needsSoldValidation = $pendingAction === 'sold_validation';
        $unreadMessagesCount = $this->messageReadService->unreadCount($reservation, $viewer);

        return [
            'id' => $reservation->id,
            'status' => $reservation->status->value,
            'created_at' => $reservation->created_at,
            'expires_at' => $reservation->expires_at,
            'messages_count' => $reservation->messages_count ?? $reservation->messages()->count(),
            'unread_messages_count' => $unreadMessagesCount,
            'needs_reply' => $unreadMessagesCount > 0,
            'needs_proposal_decision' => $isManager && $reservation->isProposalPending(),
            'needs_deposit_proof_approval' => $isManager && $reservation->isDepositProofPending(),
            'needs_witness_signature' => $needsWitnessSignature,
            'needs_sold_validation' => $needsSoldValidation,
            'needs_action' => $pendingAction !== null,
            'pending_action' => $pendingAction,
            'deposit_overdue' => $this->isDepositOverdue($reservation),
            'situation' => $this->timelineService->situation($reservation),
            'kanban_column' => $this->kanbanService->column($reservation)->value,
            'allowed_kanban_moves' => $this->kanbanService->allowedMoves($reservation, $viewer),
            'client' => $reservation->client ? [
                'id' => $reservation->client->id,
                'name' => $reservation->client->name,
            ] : null,
            'broker' => $reservation->broker ? [
                'id' => $reservation->broker->id,
                'name' => $reservation->broker->name,
            ] : null,
            'unit' => $reservation->unit ? [
                'id' => $reservation->unit->id,
                'code' => $reservation->unit->code,
                'price' => $reservation->unit->price,
                'building' => $reservation->unit->building ? [
                    'id' => $reservation->unit->building->id,
                    'name' => $reservation->unit->building->name,
                ] : null,
            ] : null,
            'garage_units' => ReservationGarageService::serializeGarageUnits($reservation),
        ];
    }

    public function pendingActionFor(Reservation $reservation, User $viewer): ?string
    {
        if ($reservation->isReadOnly() || $reservation->isSold()) {
            return null;
        }

        if ($viewer->role === 'broker') {
            return $this->pendingActionForBroker($reservation, $viewer);
        }

        return $this->pendingActionForBuilder($reservation, $viewer);
    }

    private function pendingActionForBroker(Reservation $reservation, User $viewer): ?string
    {
        if ($this->brokerShouldStartDialogue($reservation)) {
            return 'start_dialogue';
        }

        if ($reservation->isProposalReturned()) {
            return 'submit_proposal';
        }

        if ($reservation->canReturnSignedProposal()) {
            return 'return_signed_proposal';
        }

        if ($reservation->canSubmitDepositProof() && $reservation->isDepositPending()) {
            return 'submit_deposit_proof';
        }

        if ($reservation->canSubmitContractData()) {
            return 'submit_contract_data';
        }

        if ($reservation->isContractIssued() && ! $this->hasTimelineEvent($reservation, ReservationTimelineEventType::ContractSignedGov)) {
            return 'mark_signed_gov';
        }

        if ($reservation->canUploadSignedContract() && $this->hasTimelineEvent($reservation, ReservationTimelineEventType::ContractSignedGov)) {
            return 'upload_signed_contract';
        }

        if ($this->needsReplyFromUser($reservation, $viewer) && $reservation->isPreHold()) {
            return 'reply';
        }

        return null;
    }

    private function pendingActionForBuilder(Reservation $reservation, User $viewer): ?string
    {
        $slot = $reservation->currentUnsignedWitnessSlot();
        $currentWitness = $slot === null ? null : $reservation->witnessForSlot($slot);

        if ($currentWitness !== null && (int) $currentWitness->user_id === (int) $viewer->id) {
            return 'witness_signature';
        }

        $isManager = $viewer->can(BuilderPermissions::CANCEL_RESERVATIONS);

        if (! $isManager) {
            return null;
        }

        if ($reservation->isProposalPending()) {
            return 'proposal_decision';
        }

        if ($reservation->isDepositProofPending()) {
            return 'deposit_proof_approval';
        }

        if ($reservation->canUploadBuilderSignedContract()) {
            return 'builder_contract_sign';
        }

        if ($reservation->isContractBuilderSigned() && $reservation->hasAllWitnessSignatures()) {
            return 'sold_validation';
        }

        if ($this->needsReplyFromUser($reservation, $viewer) && $reservation->isPreHold()) {
            return 'reply';
        }

        return null;
    }

    private function brokerShouldStartDialogue(Reservation $reservation): bool
    {
        return $reservation->isPreHold() && $this->latestMessage($reservation) === null;
    }

    private function latestMessage(Reservation $reservation): ?ReservationMessage
    {
        if ($reservation->relationLoaded('messages')) {
            return $reservation->messages->sortByDesc('id')->first();
        }

        return $reservation->messages()->with('user:id,role')->latest('id')->first();
    }

    private function hasTimelineEvent(Reservation $reservation, ReservationTimelineEventType $type): bool
    {
        $reservation->loadMissing('timelineEvents');

        return $reservation->timelineEvents->contains(
            fn (ReservationTimelineEvent $event) => $event->type === $type,
        );
    }

    private function isDepositOverdue(Reservation $reservation): bool
    {
        return $this->hasTimelineEvent($reservation, ReservationTimelineEventType::DepositOverdue);
    }

    private function countWhereLatestMessageFromRole(Builder $reservationsQuery, string $latestAuthorRole): int
    {
        $reservationIds = (clone $reservationsQuery)->pluck('id');

        if ($reservationIds->isEmpty()) {
            return 0;
        }

        $latestMessageIds = ReservationMessage::query()
            ->select(DB::raw('MAX(id) as id'))
            ->whereIn('reservation_id', $reservationIds)
            ->groupBy('reservation_id')
            ->pluck('id');

        if ($latestMessageIds->isEmpty()) {
            return 0;
        }

        return ReservationMessage::query()
            ->whereIn('id', $latestMessageIds)
            ->whereHas('user', fn (Builder $query) => $query->where('role', $latestAuthorRole))
            ->count();
    }
}
