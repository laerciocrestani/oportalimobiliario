<?php

namespace App\Services;

use App\Enums\ReservationTimelineEventType;
use App\Enums\UserActivityAction;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\User;

/**
 * @see REQ-LOG-003
 */
class UserActivityCatalog
{
    public function __construct(
        private readonly UserActivityLogger $logger,
    ) {}

    public function recordClientCreated(User $actor, BrokerClient $client): void
    {
        $email = $client->email !== null && $client->email !== ''
            ? ", e-mail {$client->email}"
            : '';

        $this->logger->record(
            action: UserActivityAction::ClientCreated,
            message: "Cadastrou o cliente {$client->name}, telefone {$client->phone}{$email}.",
            actor: $actor,
            resourceType: 'client',
            resourceId: $client->id,
            newValues: [
                'name' => $client->name,
                'phone' => $client->phone,
                'email' => $client->email,
            ],
        );
    }

    public function recordReservationCreated(User $actor, Reservation $reservation): void
    {
        $reservation->loadMissing(['unit', 'client']);
        $client = $reservation->client;
        $clientBit = $client !== null
            ? " para o cliente {$client->name}, telefone {$client->phone}"
            : '';

        $this->logger->record(
            action: UserActivityAction::ReservationCreated,
            message: "Criou reserva da unidade {$this->unitLabel($reservation)}{$clientBit}.",
            actor: $actor,
            tenantId: $reservation->tenant_id,
            resourceType: 'reservation',
            resourceId: $reservation->id,
        );
    }

    public function recordPreHoldCancelled(User $actor, Reservation $reservation): void
    {
        $this->logger->record(
            action: UserActivityAction::ReservationPreHoldCancelled,
            message: "Cancelou a pré-reserva da unidade {$this->unitLabel($reservation)} (reserva #{$reservation->id}).",
            actor: $actor,
            tenantId: $reservation->tenant_id,
            resourceType: 'reservation',
            resourceId: $reservation->id,
        );
    }

    public function recordMessageSent(User $actor, Reservation $reservation, string $body): void
    {
        $this->logger->record(
            action: UserActivityAction::ReservationMessageSent,
            message: "Enviou mensagem na reserva da unidade {$this->unitLabel($reservation)}: {$body}",
            actor: $actor,
            tenantId: $reservation->tenant_id,
            resourceType: 'reservation',
            resourceId: $reservation->id,
            newValues: ['body' => $body],
        );
    }

    /**
     * @param  array<string, mixed>|null  $payload
     */
    public function recordFromTimeline(
        Reservation $reservation,
        ReservationTimelineEventType $type,
        User $actor,
        ?array $payload = null,
    ): void {
        $reservation->loadMissing('unit');

        $action = $this->actionFor($type);

        if ($action === null) {
            return;
        }

        $this->logger->record(
            action: $action,
            message: $this->messageFor($reservation, $type, $payload),
            actor: $actor,
            tenantId: $reservation->tenant_id,
            resourceType: 'reservation',
            resourceId: $reservation->id,
            newValues: $payload,
        );
    }

    private function actionFor(ReservationTimelineEventType $type): ?UserActivityAction
    {
        return match ($type) {
            ReservationTimelineEventType::PreHoldCreated => UserActivityAction::ReservationPreHoldCreated,
            ReservationTimelineEventType::ProposalSubmitted => UserActivityAction::ReservationProposalSubmitted,
            ReservationTimelineEventType::ProposalAccepted => UserActivityAction::ReservationProposalAccepted,
            ReservationTimelineEventType::ProposalRejected => UserActivityAction::ReservationProposalRejected,
            ReservationTimelineEventType::ProposalReturned => UserActivityAction::ReservationProposalReturned,
            ReservationTimelineEventType::DepositProofSubmitted => UserActivityAction::ReservationDepositProofSubmitted,
            ReservationTimelineEventType::DepositProofApproved => UserActivityAction::ReservationDepositProofApproved,
            ReservationTimelineEventType::ContractDataSubmitted => UserActivityAction::ReservationContractDataSubmitted,
            ReservationTimelineEventType::ContractIssued => UserActivityAction::ReservationContractIssued,
            ReservationTimelineEventType::ContractSignedGov => UserActivityAction::ReservationContractUploaded,
            ReservationTimelineEventType::ContractUploaded => UserActivityAction::ReservationContractUploaded,
            ReservationTimelineEventType::ContractValidated => UserActivityAction::ReservationContractValidated,
            ReservationTimelineEventType::Sold => UserActivityAction::ReservationSold,
            ReservationTimelineEventType::Cancelled => UserActivityAction::ReservationCancelled,
            ReservationTimelineEventType::Dialogue,
            ReservationTimelineEventType::DepositWindowOpened,
            ReservationTimelineEventType::DepositOverdue,
            ReservationTimelineEventType::Expired => null,
        };
    }

    /**
     * @param  array<string, mixed>|null  $payload
     */
    private function messageFor(
        Reservation $reservation,
        ReservationTimelineEventType $type,
        ?array $payload,
    ): string {
        $unit = $this->unitLabel($reservation);

        return match ($type) {
            ReservationTimelineEventType::PreHoldCreated => "Criou pré-reserva da unidade {$unit}.",
            ReservationTimelineEventType::ProposalSubmitted => $this->proposalSubmittedMessage($reservation, $unit, $payload),
            ReservationTimelineEventType::ProposalAccepted => "Aceitou a proposta da unidade {$unit}.",
            ReservationTimelineEventType::ProposalRejected => $this->withNote("Recusou a proposta da unidade {$unit}.", $payload),
            ReservationTimelineEventType::ProposalReturned => $this->withNote("Devolveu a proposta da unidade {$unit} para revisão.", $payload),
            ReservationTimelineEventType::DepositProofSubmitted => $this->attachmentMessage(
                "Enviou comprovante de sinal da unidade {$unit}",
                $payload['attachment_id'] ?? null,
            ),
            ReservationTimelineEventType::DepositProofApproved => "Aprovou o comprovante de sinal da unidade {$unit}.",
            ReservationTimelineEventType::ContractDataSubmitted => $this->contractDataMessage($unit, $payload),
            ReservationTimelineEventType::ContractIssued => "Emitiu o contrato da unidade {$unit}.",
            ReservationTimelineEventType::ContractSignedGov => "Registrou assinatura GOV na reserva da unidade {$unit}.",
            ReservationTimelineEventType::ContractUploaded => $this->attachmentMessage(
                "Enviou o contrato assinado da unidade {$unit}",
                $payload['attachment_id'] ?? null,
            ),
            ReservationTimelineEventType::ContractValidated => "Validou o contrato assinado da unidade {$unit}.",
            ReservationTimelineEventType::Sold => "Marcou a unidade {$unit} como vendida.",
            ReservationTimelineEventType::Cancelled => $this->withNote("Cancelou a reserva da unidade {$unit}.", $payload, 'reason'),
            default => "Registrou {$type->value} na reserva da unidade {$unit}.",
        };
    }

    /**
     * @param  array<string, mixed>|null  $payload
     */
    private function proposalSubmittedMessage(Reservation $reservation, string $unit, ?array $payload): string
    {
        $proposalId = $payload['proposal_id'] ?? null;
        $proposal = is_numeric($proposalId)
            ? ReservationProposal::query()->find((int) $proposalId)
            : $reservation->proposals()->latest('version')->first();

        if ($proposal === null) {
            return "Enviou proposta da unidade {$unit}.";
        }

        return "Enviou proposta da unidade {$unit} para {$proposal->client_name}, CPF {$proposal->client_cpf}, telefone {$proposal->client_phone}, valor do terreno R$ {$proposal->land_value}.";
    }

    /**
     * @param  array<string, mixed>|null  $payload
     */
    private function contractDataMessage(string $unit, ?array $payload): string
    {
        $client = is_array($payload['client'] ?? null) ? $payload['client'] : [];
        $name = (string) ($client['client_name'] ?? '');
        $cpf = (string) ($client['client_cpf'] ?? '');
        $who = $name !== '' ? " do cliente {$name}" : '';
        $doc = $cpf !== '' ? ", CPF {$cpf}" : '';

        return "Enviou dados para contrato da unidade {$unit}{$who}{$doc}.";
    }

    /**
     * @param  array<string, mixed>|null  $payload
     */
    private function withNote(string $prefix, ?array $payload, string $key = 'note'): string
    {
        $note = trim((string) ($payload[$key] ?? ''));

        return $note === '' ? $prefix : "{$prefix} Motivo: {$note}";
    }

    private function attachmentMessage(string $prefix, mixed $attachmentId): string
    {
        if (! is_numeric($attachmentId)) {
            return "{$prefix}.";
        }

        $attachment = ReservationAttachment::query()->find((int) $attachmentId);

        if ($attachment === null) {
            return "{$prefix}.";
        }

        return "{$prefix} (arquivo {$attachment->original_name}, tipo {$attachment->mime_type}).";
    }

    private function unitLabel(Reservation $reservation): string
    {
        $reservation->loadMissing('unit');
        $code = $reservation->unit?->code;

        return $code !== null && $code !== '' ? $code : '#'.$reservation->unit_id;
    }
}
