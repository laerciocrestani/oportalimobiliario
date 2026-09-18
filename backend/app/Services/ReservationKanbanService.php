<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationKanbanColumn;
use App\Models\Reservation;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * @see REQ-RPF-016
 * @see REQ-RPF-017
 */
class ReservationKanbanService
{
    public function __construct(
        private readonly ReservationCancellationService $cancellationService,
        private readonly ReservationHoldService $holdService,
        private readonly ReservationContractCompletionService $completionService,
        private readonly PreReservationService $preReservationService,
    ) {}

    public function column(Reservation $reservation): ReservationKanbanColumn
    {
        return match (true) {
            $reservation->isCancelled() => ReservationKanbanColumn::Cancelled,
            $reservation->isSold() => ReservationKanbanColumn::Sold,
            $reservation->isContractIssued(),
            $reservation->isContractUploaded(),
            $reservation->isContractBuilderSigned() => ReservationKanbanColumn::Contract,
            $reservation->isProposalPending(),
            $reservation->isProposalReturned() => ReservationKanbanColumn::ProposalReview,
            $reservation->isPreHold() => ReservationKanbanColumn::PreReservation,
            $this->isFormalizing($reservation) => ReservationKanbanColumn::ProposalFormalization,
            default => ReservationKanbanColumn::DocsDeposit,
        };
    }

    /**
     * @return list<string>
     */
    public function allowedMoves(Reservation $reservation, User $user): array
    {
        return array_map(
            fn (ReservationKanbanColumn $column) => $column->value,
            $this->allowedMoveColumns($reservation, $user),
        );
    }

    public function move(User $user, Reservation $reservation, ReservationKanbanColumn $target, ?string $reason = null): ?Reservation
    {
        $current = $this->column($reservation);

        if ($target === $current) {
            return $reservation;
        }

        if (! in_array($target, $this->allowedMoveColumns($reservation, $user), true)) {
            $this->fail('Não é possível mover a reserva para esta coluna.', 'invalid_transition');
        }

        if ($target === ReservationKanbanColumn::Cancelled) {
            $this->moveToCancelled($user, $reservation, $reason);

            return $reservation->fresh();
        }

        if ($target === ReservationKanbanColumn::Sold) {
            return $this->completionService->validate($user, $reservation);
        }

        $this->fail(
            'Abra o andamento para concluir esta etapa.',
            'action_required',
            $this->requiredAction($reservation, $user, $target),
        );
    }

    /**
     * @return list<ReservationKanbanColumn>
     */
    private function allowedMoveColumns(Reservation $reservation, User $user): array
    {
        if ($reservation->isSold() || $reservation->isCancelled()) {
            return [];
        }

        if ($user->role === 'builder' && ! $user->can(BuilderPermissions::CANCEL_RESERVATIONS)) {
            return [];
        }

        if ($user->role === 'broker' && (int) $reservation->broker_id !== (int) $user->id) {
            return [];
        }

        $moves = [ReservationKanbanColumn::Cancelled];

        if ($user->role === 'broker') {
            if ($reservation->canSubmitProposal()) {
                $moves[] = ReservationKanbanColumn::ProposalReview;
            }

            if ($reservation->canSubmitDepositProof()) {
                $moves[] = ReservationKanbanColumn::DocsDeposit;
            }

            if ($reservation->canReturnSignedProposal() && $this->isFormalizing($reservation)) {
                $moves[] = ReservationKanbanColumn::DocsDeposit;
            }

            if ($reservation->canSubmitContractData() || $reservation->canUploadSignedContract()) {
                $moves[] = ReservationKanbanColumn::Contract;
            }
        }

        if ($user->role === 'builder') {
            if ($reservation->isProposalPending()) {
                $moves[] = ReservationKanbanColumn::ProposalFormalization;
            }

            if ($reservation->isContractDataPending()) {
                $moves[] = ReservationKanbanColumn::Contract;
            }

            if ($reservation->canValidateContract()) {
                $moves[] = ReservationKanbanColumn::Sold;
            }
        }

        $current = $this->column($reservation);
        $unique = [];

        foreach ($moves as $column) {
            if ($column === $current) {
                continue;
            }

            $unique[$column->value] = $column;
        }

        return array_values($unique);
    }

    private function requiredAction(Reservation $reservation, User $user, ReservationKanbanColumn $target): string
    {
        if ($target === ReservationKanbanColumn::ProposalReview) {
            return 'submit_proposal';
        }

        if ($target === ReservationKanbanColumn::ProposalFormalization) {
            return 'decide_proposal';
        }

        if ($target === ReservationKanbanColumn::DocsDeposit) {
            if ($reservation->canReturnSignedProposal()) {
                return 'return_signed_proposal';
            }

            return 'submit_deposit_proof';
        }

        if ($target === ReservationKanbanColumn::Contract) {
            if ($user->role === 'builder') {
                return 'issue_contract';
            }

            if ($reservation->canUploadSignedContract()) {
                return 'upload_signed_contract';
            }

            return 'submit_contract_data';
        }

        if ($target === ReservationKanbanColumn::Sold) {
            return 'validate_contract';
        }

        if ($reservation->hasClientHold() && $user->role === 'builder') {
            return 'drop_hold';
        }

        return 'cancel';
    }

    private function moveToCancelled(User $user, Reservation $reservation, ?string $reason): void
    {
        if ($reservation->isPreHold() && $reservation->client_id === null && $user->role === 'broker') {
            $this->preReservationService->releasePreHold($user, $reservation);

            return;
        }

        $trimmed = trim((string) $reason);

        if ($trimmed === '') {
            $this->fail(
                'Informe o motivo do cancelamento.',
                'action_required',
                $reservation->hasClientHold() && $user->role === 'builder' ? 'drop_hold' : 'cancel',
            );
        }

        if ($reservation->hasClientHold() && $user->role === 'builder') {
            $this->holdService->drop($user, $reservation, $trimmed);

            return;
        }

        $this->cancellationService->cancel($user, $reservation, $trimmed);
    }

    private function isFormalizing(Reservation $reservation): bool
    {
        if (! $reservation->isDepositPending()) {
            return false;
        }

        return $this->hasAttachmentKind($reservation, ReservationAttachmentKind::ProposalSignedBuilder)
            && ! $this->hasAttachmentKind($reservation, ReservationAttachmentKind::ProposalSignedBoth);
    }

    private function hasAttachmentKind(Reservation $reservation, ReservationAttachmentKind $kind): bool
    {
        if ($reservation->relationLoaded('attachments')) {
            return $reservation->attachments->contains(
                fn ($attachment) => $attachment->kind === $kind,
            );
        }

        return $reservation->attachments()->where('kind', $kind)->exists();
    }

    private function fail(string $message, string $code, ?string $action = null): never
    {
        $payload = [
            'message' => $message,
            'code' => $code,
        ];

        if ($action !== null) {
            $payload['action'] = $action;
        }

        throw new HttpResponseException(response()->json($payload, 422));
    }
}
