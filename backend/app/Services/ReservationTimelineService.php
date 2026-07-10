<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Models\Reservation;
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

    /**
     * @param  array<string, mixed>|null  $payload
     */
    public function record(
        Reservation $reservation,
        ReservationTimelineEventType $type,
        ?User $actor = null,
        ?array $payload = null,
    ): ReservationTimelineEvent {
        return ReservationTimelineEvent::query()->create([
            'reservation_id' => $reservation->id,
            'type' => $type,
            'actor_id' => $actor?->id,
            'payload' => $payload,
        ]);
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
        $reservation->loadMissing(['unit', 'broker', 'timelineEvents.actor']);

        $events = $reservation->timelineEvents->sortBy('created_at');
        $messagesCount = $reservation->messages()->count();

        $currentStepKey = $this->resolveCurrentStepKey($reservation, $messagesCount, $events);
        $currentStage = $this->resolveCurrentStage($reservation, $currentStepKey);

        $steps = $this->buildSteps($reservation, $events, $messagesCount, $currentStepKey, $viewer);

        return [
            'reservation_id' => $reservation->id,
            'current_stage' => $currentStage,
            'expires_at' => $reservation->expires_at?->toIso8601String(),
            'unit' => [
                'id' => $reservation->unit->id,
                'code' => $reservation->unit->code,
                'status' => $reservation->unit->status->value,
            ],
            'steps' => $steps,
        ];
    }

    private function hasEvent(Reservation $reservation, ReservationTimelineEventType $type): bool
    {
        return ReservationTimelineEvent::query()
            ->where('reservation_id', $reservation->id)
            ->where('type', $type)
            ->exists();
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

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ContractUploaded)) {
            return 'contract_validate';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ContractIssued)) {
            return 'contract_sign_gov';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::ContractDataSubmitted)) {
            return 'contract_issue';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::DepositProofApproved)) {
            return 'contract_data';
        }

        if ($events->contains(fn (ReservationTimelineEvent $event) => $event->type === ReservationTimelineEventType::DepositProofSubmitted)) {
            return 'deposit_proof';
        }

        if ($reservation->isConfirmed()) {
            return 'deposit_window';
        }

        if ($reservation->isPreHold()) {
            return $messagesCount > 0 ? 'proposal_submitted' : 'dialogue';
        }

        return 'pre_hold_created';
    }

    private function resolveCurrentStage(Reservation $reservation, string $currentStepKey): string
    {
        if ($currentStepKey === 'sold') {
            return 'sold';
        }

        if ($reservation->isConfirmed()) {
            return 'deposit_pending';
        }

        if ($reservation->isPreHold()) {
            return match ($currentStepKey) {
                'proposal_submitted' => 'pre_hold',
                default => 'pre_hold',
            };
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
        $isLegacyConfirmed = $reservation->isConfirmed()
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

        if ($stepEvents->isEmpty() && $reservation->isConfirmed() && $stepKey === 'deposit_window') {
            return $index === $currentIndex ? 'current' : 'upcoming';
        }

        return 'upcoming';
    }

    private function resolveOccurredAt(
        string $stepKey,
        ?ReservationTimelineEvent $latestEvent,
        Reservation $reservation,
        int $messagesCount,
    ): ?string {
        if ($latestEvent !== null) {
            return $latestEvent->created_at?->toIso8601String();
        }

        if ($stepKey === 'pre_hold_created') {
            return $reservation->created_at?->toIso8601String();
        }

        if ($stepKey === 'dialogue' && $messagesCount > 0) {
            $firstMessage = $reservation->messages()->oldest()->first();

            return $firstMessage?->created_at?->toIso8601String();
        }

        if ($stepKey === 'deposit_window' && $reservation->isConfirmed()) {
            return $reservation->updated_at?->toIso8601String();
        }

        return null;
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
            'deposit_window' => $isBroker ? ['submit_deposit_proof'] : [],
            'deposit_proof' => $isBroker ? [] : ['approve_deposit_proof'],
            'contract_data' => $isBroker ? ['submit_contract_data'] : [],
            'contract_issue' => $isBroker ? [] : ['issue_contract'],
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
}
