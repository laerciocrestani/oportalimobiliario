<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationTimelineEventType;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * @see REQ-RTL-024
 * @see REQ-RTL-025
 * @see REQ-RTL-029
 */
class ReservationTimelineService
{
    /** @var list<array{key: string, label: string, event_types: list<ReservationTimelineEventType>}> */
    private const STEPS = [
        ['key' => 'pre_hold_created', 'label' => 'Pré-reserva', 'event_types' => [ReservationTimelineEventType::PreHoldCreated]],
        ['key' => 'dialogue', 'label' => 'Diálogo com construtora', 'event_types' => [ReservationTimelineEventType::Dialogue]],
        ['key' => 'proposal_submitted', 'label' => 'Proposta enviada', 'event_types' => [ReservationTimelineEventType::ProposalSubmitted]],
        ['key' => 'proposal_decision', 'label' => 'Decisão do gestor', 'event_types' => [
            ReservationTimelineEventType::ProposalAccepted,
            ReservationTimelineEventType::ProposalRejected,
            ReservationTimelineEventType::ProposalReturned,
        ]],
        ['key' => 'deposit_window', 'label' => 'Aguardando sinal (48h)', 'event_types' => [
            ReservationTimelineEventType::DepositWindowOpened,
            ReservationTimelineEventType::DepositOverdue,
        ]],
        ['key' => 'deposit_proof', 'label' => 'Comprovante de pagamento', 'event_types' => [
            ReservationTimelineEventType::DepositProofSubmitted,
            ReservationTimelineEventType::DepositProofApproved,
        ]],
        ['key' => 'contract_data', 'label' => 'Dados para contrato', 'event_types' => [ReservationTimelineEventType::ContractDataSubmitted]],
        ['key' => 'contract_issue', 'label' => 'Emissão do contrato', 'event_types' => [ReservationTimelineEventType::ContractIssued]],
        ['key' => 'contract_sign_gov', 'label' => 'Assinatura GOV', 'event_types' => [ReservationTimelineEventType::ContractSignedGov]],
        ['key' => 'contract_upload', 'label' => 'Contrato assinado enviado', 'event_types' => [ReservationTimelineEventType::ContractUploaded]],
        ['key' => 'contract_validate', 'label' => 'Validação final', 'event_types' => [ReservationTimelineEventType::ContractValidated]],
        ['key' => 'sold', 'label' => 'Unidade vendida', 'event_types' => [ReservationTimelineEventType::Sold]],
    ];

    public function __construct(
        private readonly UserActivityCatalog $activityCatalog,
    ) {}

    /**
     * @param  array<string, mixed>|null  $payload
     */
    public function record(
        Reservation $reservation,
        ReservationTimelineEventType $type,
        ?User $actor = null,
        ?array $payload = null,
    ): ReservationTimelineEvent {
        $event = ReservationTimelineEvent::query()->create([
            'reservation_id' => $reservation->id,
            'type' => $type,
            'actor_id' => $actor?->id,
            'payload' => $payload,
        ]);

        if ($actor !== null) {
            $this->activityCatalog->recordFromTimeline($reservation, $type, $actor, $payload);
        }

        return $event;
    }

    public function recordPreHoldCreated(Reservation $reservation, User $broker): void
    {
        if ($this->hasEvent($reservation, ReservationTimelineEventType::PreHoldCreated)) {
            return;
        }

        $this->record($reservation, ReservationTimelineEventType::PreHoldCreated, $broker);
    }

    public function recordDialogue(Reservation $reservation, User $actor): void
    {
        if ($this->hasEvent($reservation, ReservationTimelineEventType::Dialogue)) {
            return;
        }

        $this->record($reservation, ReservationTimelineEventType::Dialogue, $actor);
    }

    public function recordDepositWindowOpened(Reservation $reservation): void
    {
        if ($this->hasEvent($reservation, ReservationTimelineEventType::DepositWindowOpened)) {
            return;
        }

        $this->record($reservation, ReservationTimelineEventType::DepositWindowOpened);
    }

    /**
     * @return array<string, mixed>
     */
    public function build(Reservation $reservation, User $viewer): array
    {
        $reservation->loadMissing(['unit', 'broker', 'client', 'timelineEvents.actor', 'proposals', 'attachments']);

        $events = $reservation->timelineEvents->sortBy('created_at');
        $messagesCount = $reservation->messages()->count();

        $currentStepKey = $this->resolveCurrentStepKey($reservation, $messagesCount, $events);
        $currentStage = $this->resolveCurrentStage($reservation, $currentStepKey);

        $steps = $this->buildSteps($reservation, $events, $messagesCount, $currentStepKey, $viewer);
        $currentProposal = $reservation->proposals()->latest('version')->first();
        $attachmentPrefix = $viewer->role === 'broker'
            ? "/broker/reservations/{$reservation->id}/attachments"
            : "/builder/reservations/{$reservation->id}/attachments";
        $visibleAttachments = $this->visibleAttachments($reservation, $viewer, $attachmentPrefix);
        $currentDepositProof = $reservation->attachments
            ->where('kind', ReservationAttachmentKind::DepositProof)
            ->sortByDesc('id')
            ->first();
        $currentSignedContract = $reservation->attachments
            ->where('kind', ReservationAttachmentKind::ContractSigned)
            ->sortByDesc('id')
            ->first();

        $depositOverdue = $events->contains(
            fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::DepositOverdue,
        );

        return [
            'reservation_id' => $reservation->id,
            'current_stage' => $currentStage,
            'expires_at' => $reservation->expires_at?->toIso8601String(),
            'deposit_overdue' => $depositOverdue,
            'unit' => [
                'id' => $reservation->unit->id,
                'code' => $reservation->unit->code,
                'status' => $reservation->unit->status->value,
            ],
            'client' => $reservation->client === null ? null : [
                'id' => $reservation->client->id,
                'name' => $reservation->client->name,
                'phone' => $reservation->client->phone,
                'email' => $reservation->client->email,
            ],
            'current_proposal' => $currentProposal?->toApiArray(),
            'current_deposit_proof' => $currentDepositProof?->toApiArray($attachmentPrefix),
            'current_signed_contract' => $currentSignedContract?->toApiArray($attachmentPrefix),
            'attachments' => $visibleAttachments,
            'steps' => $steps,
        ];
    }

    /**
     * Historic files stay available after the process moves on.
     *
     * Brokers can download the issued contract PDF (read-only).
     *
     * @return list<array<string, mixed>>
     */
    private function visibleAttachments(Reservation $reservation, User $viewer, string $attachmentPrefix): array
    {
        $attachments = $reservation->attachments
            ->sortBy('id')
            ->values();

        return $attachments
            ->map(fn (ReservationAttachment $attachment) => $attachment->toApiArray($attachmentPrefix))
            ->values()
            ->all();
    }

    /**
     * Compact previous/current/next snapshot for reservation lists.
     *
     * @see REQ-RTL-027
     *
     * @return array{
     *     previous: array{key: string, label: string, occurred_at: string|null}|null,
     *     current: array{key: string, label: string, occurred_at: string|null, status: string, waiting_on: string|null},
     *     next: array{key: string, label: string, occurred_at: string|null}|null
     * }
     */
    public function situation(Reservation $reservation): array
    {
        $reservation->loadMissing(['timelineEvents', 'proposals', 'messages', 'attachments']);

        $events = $reservation->timelineEvents->sortBy('created_at');
        $messagesCount = $reservation->messages_count ?? $reservation->messages->count();
        $currentKey = $this->resolveCurrentStepKey($reservation, $messagesCount, $events);
        $currentIndex = $this->stepIndex($currentKey);

        $currentStatus = $this->resolveSituationStatus($currentKey, $events);
        $current = $this->situationStep(
            $currentIndex,
            $reservation,
            $events,
            $messagesCount,
            $currentIndex,
            $currentStatus,
        ) ?? [
            'key' => $currentKey,
            'label' => $currentKey,
            'occurred_at' => $reservation->created_at?->toIso8601String(),
            'status' => $currentStatus,
        ];
        $current['waiting_on'] = $this->resolveWaitingOn($currentKey, $currentStatus);

        return [
            'previous' => $this->situationStep($currentIndex - 1, $reservation, $events, $messagesCount, $currentIndex),
            'current' => $current,
            'next' => $this->situationStep($currentIndex + 1, $reservation, $events, $messagesCount, $currentIndex),
        ];
    }

    private function hasEvent(Reservation $reservation, ReservationTimelineEventType $type): bool
    {
        return ReservationTimelineEvent::query()
            ->where('reservation_id', $reservation->id)
            ->where('type', $type)
            ->exists();
    }

    public function hasEventType(Reservation $reservation, ReservationTimelineEventType $type): bool
    {
        return $this->hasEvent($reservation, $type);
    }

    /**
     * @param  Collection<int, ReservationTimelineEvent>  $events
     */
    private function resolveCurrentStepKey(
        Reservation $reservation,
        int $messagesCount,
        Collection $events,
    ): string {
        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::Sold)) {
            return 'sold';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ProposalRejected)) {
            return 'proposal_decision';
        }

        if ($reservation->isProposalPending()) {
            return 'proposal_decision';
        }

        if ($reservation->isProposalReturned()) {
            return 'proposal_submitted';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ContractValidated)
            || $reservation->isSold()) {
            return 'sold';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ContractUploaded)
            || $reservation->isContractUploaded()) {
            return 'contract_validate';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ContractSignedGov)) {
            return 'contract_upload';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ContractIssued)) {
            return 'contract_sign_gov';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ContractDataSubmitted)) {
            return 'contract_issue';
        }

        if ($reservation->isContractDataPending()) {
            return 'contract_data';
        }

        if ($reservation->isDepositProofPending()) {
            return 'deposit_proof';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::DepositProofApproved)) {
            return 'contract_data';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::DepositProofSubmitted)) {
            return 'deposit_proof';
        }

        if ($reservation->isDepositPending()) {
            return 'deposit_window';
        }

        if ($reservation->isPreHold()) {
            return $messagesCount > 0 ? 'proposal_submitted' : 'dialogue';
        }

        return 'pre_hold_created';
    }

    private function resolveCurrentStage(Reservation $reservation, string $currentStepKey): string
    {
        if ($reservation->isSold()) {
            return 'sold';
        }

        if ($reservation->isCancelled()) {
            return 'cancelled';
        }

        if ($reservation->isProposalPending()) {
            return 'proposal_pending';
        }

        if ($reservation->isProposalReturned()) {
            return 'proposal_returned';
        }

        if ($reservation->isContractUploaded()) {
            return 'contract_uploaded';
        }

        if ($reservation->isContractIssued()) {
            return 'contract_issued';
        }

        if ($reservation->isContractDataPending()) {
            return 'contract_data_pending';
        }

        if ($reservation->isDepositProofPending()) {
            return 'deposit_proof_pending';
        }

        if ($reservation->isDepositPending()) {
            return 'deposit_pending';
        }

        if ($reservation->isPreHold()) {
            return 'pre_hold';
        }

        return 'pre_hold';
    }

    /**
     * @param  Collection<int, ReservationTimelineEvent>  $events
     * @return list<array<string, mixed>>
     */
    private function buildSteps(
        Reservation $reservation,
        Collection $events,
        int $messagesCount,
        string $currentStepKey,
        User $viewer,
    ): array {
        $currentIndex = $this->stepIndex($currentStepKey);
        $isLegacyConfirmed = $reservation->isDepositPending()
            && ! $events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ProposalSubmitted);

        $steps = [];

        foreach (self::STEPS as $index => $definition) {
            $stepEvents = $events->filter(
                fn (ReservationTimelineEvent $event) => in_array($event->type, $definition['event_types'], true),
            );

            $status = $this->resolveStepStatus(
                $index,
                $currentIndex,
                $definition['key'],
                $stepEvents,
                $reservation,
                $messagesCount,
                $isLegacyConfirmed,
            );

            $latestEvent = $stepEvents->sortByDesc('created_at')->first();

            $step = [
                'key' => $definition['key'],
                'label' => $definition['label'],
                'status' => $status,
                'occurred_at' => $this->resolveOccurredAt(
                    $definition['key'],
                    $latestEvent,
                    $reservation,
                    $messagesCount,
                    $status,
                ),
                'due_at' => $this->resolveDueAt($definition['key'], $status, $reservation),
                'actor' => $this->formatActor($latestEvent),
                'actions' => $status === 'current'
                    ? $this->resolveActions($definition['key'], $viewer)
                    : [],
            ];

            $steps[] = $step;
        }

        return $steps;
    }

    /**
     * @param  Collection<int, ReservationTimelineEvent>  $stepEvents
     */
    private function resolveStepStatus(
        int $index,
        int $currentIndex,
        string $stepKey,
        Collection $stepEvents,
        Reservation $reservation,
        int $messagesCount,
        bool $isLegacyConfirmed,
    ): string {
        if ($stepEvents->isNotEmpty()) {
            $failedTypes = [
                ReservationTimelineEventType::ProposalRejected,
                ReservationTimelineEventType::DepositOverdue,
            ];

            if ($stepEvents->contains(fn (ReservationTimelineEvent $event) => in_array($event->type, $failedTypes, true))) {
                return 'failed';
            }

            return $index < $currentIndex ? 'completed' : ($index === $currentIndex ? 'current' : 'upcoming');
        }

        if ($isLegacyConfirmed && in_array($stepKey, ['proposal_submitted', 'proposal_decision'], true)) {
            return 'completed';
        }

        if ($stepKey === 'pre_hold_created' && $index <= $currentIndex) {
            return 'completed';
        }

        if ($stepKey === 'dialogue' && $messagesCount > 0 && $index <= $currentIndex) {
            return 'completed';
        }

        if ($index < $currentIndex) {
            return 'completed';
        }

        if ($index === $currentIndex) {
            return 'current';
        }

        if ($reservation->isCancelled()) {
            return 'skipped';
        }

        if ($stepEvents->isEmpty() && $reservation->isDepositPending() && $stepKey === 'deposit_window') {
            return $index === $currentIndex ? 'current' : 'upcoming';
        }

        return 'upcoming';
    }

    private function resolveOccurredAt(
        string $stepKey,
        ?ReservationTimelineEvent $latestEvent,
        Reservation $reservation,
        int $messagesCount,
        string $status,
    ): ?string {
        if ($latestEvent !== null) {
            return $latestEvent->created_at?->toIso8601String();
        }

        $fallback = match ($stepKey) {
            'pre_hold_created' => $reservation->created_at?->toIso8601String(),
            'dialogue' => $this->firstMessageOccurredAt($reservation, $messagesCount),
            'proposal_submitted' => $this->latestProposal($reservation)?->created_at?->toIso8601String(),
            'proposal_decision' => $this->latestDecidedProposal($reservation)?->decided_at?->toIso8601String(),
            'deposit_window' => $this->depositWindowOccurredAt($reservation),
            'deposit_proof' => $this->latestAttachmentOccurredAt($reservation, ReservationAttachmentKind::DepositProof),
            default => null,
        };

        if ($fallback !== null) {
            return $fallback;
        }

        if (in_array($status, ['completed', 'failed'], true)) {
            return $reservation->created_at?->toIso8601String();
        }

        return null;
    }

    private function firstMessageOccurredAt(Reservation $reservation, int $messagesCount): ?string
    {
        if ($messagesCount < 1) {
            return null;
        }

        $firstMessage = $reservation->relationLoaded('messages')
            ? $reservation->messages->sortBy('id')->first()
            : $reservation->messages()->oldest()->first();

        return $firstMessage?->created_at?->toIso8601String();
    }

    private function latestProposal(Reservation $reservation): ?ReservationProposal
    {
        $reservation->loadMissing('proposals');

        return $reservation->proposals->sortByDesc('version')->first();
    }

    private function latestDecidedProposal(Reservation $reservation): ?ReservationProposal
    {
        $reservation->loadMissing('proposals');

        return $reservation->proposals
            ->filter(fn (ReservationProposal $proposal) => $proposal->decided_at !== null)
            ->sortByDesc('decided_at')
            ->first();
    }

    private function depositWindowOccurredAt(Reservation $reservation): ?string
    {
        if (! $reservation->isConfirmed() || $reservation->expires_at === null) {
            return null;
        }

        $hours = (int) config('opim.deposit_window_hours', 48);

        return $reservation->expires_at->copy()->subHours($hours)->toIso8601String();
    }

    private function latestAttachmentOccurredAt(Reservation $reservation, ReservationAttachmentKind $kind): ?string
    {
        $reservation->loadMissing('attachments');

        $attachment = $reservation->attachments
            ->where('kind', $kind)
            ->sortByDesc('id')
            ->first();

        return $attachment instanceof ReservationAttachment
            ? $attachment->created_at?->toIso8601String()
            : null;
    }

    private function resolveDueAt(string $stepKey, string $status, Reservation $reservation): ?string
    {
        if ($status !== 'current') {
            return null;
        }

        if (in_array($stepKey, ['pre_hold_created', 'dialogue', 'deposit_window'], true)) {
            return $reservation->expires_at?->toIso8601String();
        }

        return null;
    }

    /**
     * @return array{id: int, name: string, role: string}|null
     */
    private function formatActor(?ReservationTimelineEvent $event): ?array
    {
        if ($event?->actor === null) {
            return null;
        }

        return [
            'id' => $event->actor->id,
            'name' => $event->actor->name,
            'role' => $event->actor->role,
        ];
    }

    /**
     * @return list<string>
     */
    private function resolveActions(string $stepKey, User $viewer): array
    {
        $isBroker = $viewer->role === 'broker';

        return match ($stepKey) {
            'dialogue' => ['open_dialogue'],
            'proposal_submitted' => $isBroker ? ['submit_proposal', 'open_dialogue'] : ['open_dialogue'],
            'proposal_decision' => $isBroker ? ['open_dialogue'] : ['decide_proposal', 'open_dialogue'],
            'deposit_window' => $isBroker ? ['submit_deposit_proof'] : [],
            'deposit_proof' => $isBroker ? [] : ['approve_deposit_proof'],
            'contract_data' => $isBroker ? ['submit_contract_data'] : [],
            'contract_issue' => $isBroker ? [] : ['issue_contract'],
            'contract_sign_gov' => $isBroker ? ['mark_signed_gov'] : ['issue_contract'],
            'contract_upload' => $isBroker ? ['upload_signed_contract'] : [],
            'contract_validate' => $isBroker ? [] : ['validate_contract'],
            default => [],
        };
    }

    private function stepIndex(string $key): int
    {
        foreach (self::STEPS as $index => $step) {
            if ($step['key'] === $key) {
                return $index;
            }
        }

        return 0;
    }

    /**
     * @return array{key: string, label: string}|null
     */
    private function stepRef(int $index): ?array
    {
        $step = self::STEPS[$index] ?? null;

        if ($step === null) {
            return null;
        }

        return [
            'key' => $step['key'],
            'label' => $step['label'],
        ];
    }

    /**
     * @param  Collection<int, ReservationTimelineEvent>  $events
     * @return array{key: string, label: string, occurred_at: string|null, status?: string}|null
     */
    private function situationStep(
        int $index,
        Reservation $reservation,
        Collection $events,
        int $messagesCount,
        int $currentIndex,
        ?string $status = null,
    ): ?array {
        $ref = $this->stepRef($index);

        if ($ref === null) {
            return null;
        }

        $definition = self::STEPS[$index];
        $stepEvents = $events->filter(
            fn (ReservationTimelineEvent $event) => in_array($event->type, $definition['event_types'], true),
        );
        $latestEvent = $stepEvents->sortByDesc('created_at')->first();
        $progress = $index < $currentIndex
            ? 'completed'
            : ($index === $currentIndex ? ($status ?? 'current') : 'upcoming');

        $step = [
            ...$ref,
            'occurred_at' => $this->resolveOccurredAt(
                $definition['key'],
                $latestEvent,
                $reservation,
                $messagesCount,
                $progress,
            ),
        ];

        if ($status !== null) {
            $step['status'] = $status;
        }

        return $step;
    }

    /**
     * @param  Collection<int, ReservationTimelineEvent>  $events
     */
    private function resolveSituationStatus(string $currentKey, Collection $events): string
    {
        if ($currentKey === 'sold') {
            return 'completed';
        }

        $isFailed = match ($currentKey) {
            'proposal_decision' => $events->contains(
                fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ProposalRejected,
            ),
            'deposit_window' => $events->contains(
                fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::DepositOverdue,
            ),
            default => false,
        };

        return $isFailed ? 'failed' : 'current';
    }

    /**
     * @return 'broker'|'builder'|null
     */
    private function resolveWaitingOn(string $currentKey, string $currentStatus): ?string
    {
        if ($currentStatus === 'completed') {
            return null;
        }

        if ($currentKey === 'proposal_decision' && $currentStatus === 'failed') {
            return null;
        }

        return match ($currentKey) {
            'pre_hold_created',
            'dialogue',
            'proposal_submitted',
            'deposit_window',
            'contract_data',
            'contract_sign_gov',
            'contract_upload' => 'broker',
            'proposal_decision',
            'deposit_proof',
            'contract_issue',
            'contract_validate' => 'builder',
            default => null,
        };
    }
}
