<?php

namespace App\Services;

use App\Enums\BrokerInviteChannel;
use App\Enums\ReservationTimelineEventType;
use App\Enums\UnitStatus;
use App\Enums\UserActivityAction;
use App\Models\BrokerClient;
use App\Models\BrokerInvite;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\Tenant;
use App\Models\Tower;
use App\Models\Unit;
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

    public function recordBuildingCreated(User $actor, Building $building): void
    {
        $this->logger->record(
            action: UserActivityAction::BuildingCreated,
            message: "Cadastrou o empreendimento {$building->name}.",
            actor: $actor,
            tenantId: $building->tenant_id,
            resourceType: 'building',
            resourceId: $building->id,
            newValues: ['name' => $building->name, 'published' => $building->published],
        );

        if ($building->published) {
            $this->recordBuildingPublished($actor, $building);
        }
    }

    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     */
    public function recordBuildingUpdated(User $actor, Building $building, array $oldValues, array $newValues): void
    {
        $this->logger->record(
            action: UserActivityAction::BuildingUpdated,
            message: "Atualizou o empreendimento {$building->name}.",
            actor: $actor,
            tenantId: $building->tenant_id,
            resourceType: 'building',
            resourceId: $building->id,
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }

    public function recordBuildingDeleted(User $actor, Building $building): void
    {
        $this->logger->record(
            action: UserActivityAction::BuildingDeleted,
            message: "Excluiu o empreendimento {$building->name}.",
            actor: $actor,
            tenantId: $building->tenant_id,
            resourceType: 'building',
            resourceId: $building->id,
            oldValues: ['name' => $building->name],
        );
    }

    public function recordBuildingPublished(User $actor, Building $building): void
    {
        $this->logger->record(
            action: UserActivityAction::BuildingPublished,
            message: "Publicou o empreendimento {$building->name}.",
            actor: $actor,
            tenantId: $building->tenant_id,
            resourceType: 'building',
            resourceId: $building->id,
            newValues: ['published' => true],
        );
    }

    public function recordBuildingStructureReplaced(User $actor, Building $building, int $towerCount): void
    {
        $this->logger->record(
            action: UserActivityAction::BuildingUpdated,
            message: "Definiu a estrutura do empreendimento {$building->name} com {$towerCount} torre(s).",
            actor: $actor,
            tenantId: $building->tenant_id,
            resourceType: 'building',
            resourceId: $building->id,
            newValues: ['towers_count' => $towerCount],
        );
    }

    public function recordBuildingUnitGridReplaced(User $actor, Building $building, int $unitCount): void
    {
        $this->logger->record(
            action: UserActivityAction::BuildingUpdated,
            message: "Definiu a planta de unidades do empreendimento {$building->name} ({$unitCount} unidade(s)).",
            actor: $actor,
            tenantId: $building->tenant_id,
            resourceType: 'building',
            resourceId: $building->id,
            newValues: ['units_count' => $unitCount],
        );
    }

    public function recordTowerCreated(User $actor, Tower $tower): void
    {
        $tower->loadMissing('building');

        $this->logger->record(
            action: UserActivityAction::TowerCreated,
            message: "Cadastrou a torre {$tower->name} no empreendimento {$this->buildingName($tower->building)}.",
            actor: $actor,
            tenantId: $tower->tenant_id,
            resourceType: 'tower',
            resourceId: $tower->id,
            newValues: ['name' => $tower->name, 'building_id' => $tower->building_id],
        );
    }

    public function recordTowerUpdated(User $actor, Tower $tower, array $oldValues, array $newValues): void
    {
        $tower->loadMissing('building');

        $this->logger->record(
            action: UserActivityAction::TowerUpdated,
            message: "Atualizou a torre {$tower->name} do empreendimento {$this->buildingName($tower->building)}.",
            actor: $actor,
            tenantId: $tower->tenant_id,
            resourceType: 'tower',
            resourceId: $tower->id,
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }

    public function recordTowerDeleted(User $actor, Tower $tower): void
    {
        $tower->loadMissing('building');

        $this->logger->record(
            action: UserActivityAction::TowerDeleted,
            message: "Excluiu a torre {$tower->name} do empreendimento {$this->buildingName($tower->building)}.",
            actor: $actor,
            tenantId: $tower->tenant_id,
            resourceType: 'tower',
            resourceId: $tower->id,
            oldValues: ['name' => $tower->name],
        );
    }

    public function recordUnitCreated(User $actor, Unit $unit): void
    {
        $unit->loadMissing('building');

        $this->logger->record(
            action: UserActivityAction::UnitCreated,
            message: "Cadastrou a unidade {$unit->code} no empreendimento {$this->buildingName($unit->building)}.",
            actor: $actor,
            tenantId: $unit->tenant_id,
            resourceType: 'unit',
            resourceId: $unit->id,
            newValues: [
                'code' => $unit->code,
                'status' => $unit->status->value,
                'price' => $unit->price,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     */
    public function recordUnitUpdated(User $actor, Unit $unit, array $oldValues, array $newValues): void
    {
        $unit->loadMissing('building');

        $this->logger->record(
            action: UserActivityAction::UnitUpdated,
            message: "Atualizou a unidade {$unit->code} do empreendimento {$this->buildingName($unit->building)}.",
            actor: $actor,
            tenantId: $unit->tenant_id,
            resourceType: 'unit',
            resourceId: $unit->id,
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }

    public function recordUnitDeleted(User $actor, Unit $unit): void
    {
        $unit->loadMissing('building');

        $this->logger->record(
            action: UserActivityAction::UnitDeleted,
            message: "Excluiu a unidade {$unit->code} do empreendimento {$this->buildingName($unit->building)}.",
            actor: $actor,
            tenantId: $unit->tenant_id,
            resourceType: 'unit',
            resourceId: $unit->id,
            oldValues: ['code' => $unit->code],
        );
    }

    public function recordUnitStatusChanged(User $actor, Unit $unit, UnitStatus $from, UnitStatus $to): void
    {
        $unit->loadMissing('building');

        $this->logger->record(
            action: UserActivityAction::UnitStatusChanged,
            message: "Alterou o status da unidade {$unit->code} de {$this->unitStatusLabel($from)} para {$this->unitStatusLabel($to)}.",
            actor: $actor,
            tenantId: $unit->tenant_id,
            resourceType: 'unit',
            resourceId: $unit->id,
            oldValues: ['status' => $from->value],
            newValues: ['status' => $to->value],
        );
    }

    /**
     * @param  list<string>  $permissions
     */
    public function recordTeamMemberCreated(User $actor, User $member, array $permissions): void
    {
        $this->logger->record(
            action: UserActivityAction::TeamMemberCreated,
            message: "Cadastrou o membro da equipe {$member->name}, e-mail {$member->email}.",
            actor: $actor,
            tenantId: $member->tenant_id,
            resourceType: 'user',
            resourceId: $member->id,
            newValues: [
                'name' => $member->name,
                'email' => $member->email,
                'permissions' => $permissions,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $newValues
     */
    public function recordTeamMemberUpdated(User $actor, User $member, array $newValues): void
    {
        $this->logger->record(
            action: UserActivityAction::TeamMemberUpdated,
            message: "Atualizou o membro da equipe {$member->name}, e-mail {$member->email}.",
            actor: $actor,
            tenantId: $member->tenant_id,
            resourceType: 'user',
            resourceId: $member->id,
            newValues: $newValues,
        );
    }

    public function recordTeamMemberDeleted(User $actor, User $member): void
    {
        $this->logger->record(
            action: UserActivityAction::TeamMemberDeleted,
            message: "Removeu o membro da equipe {$member->name}, e-mail {$member->email}.",
            actor: $actor,
            tenantId: $member->tenant_id,
            resourceType: 'user',
            resourceId: $member->id,
            oldValues: ['name' => $member->name, 'email' => $member->email],
        );
    }

    public function recordBrokerInviteCreated(User $actor, BrokerInvite $invite): void
    {
        $via = match ($invite->channel) {
            BrokerInviteChannel::WhatsApp => "WhatsApp {$invite->phone}",
            BrokerInviteChannel::Email => "e-mail {$invite->email}",
            BrokerInviteChannel::Link => 'link',
        };

        $this->logger->record(
            action: UserActivityAction::BrokerInviteCreated,
            message: "Convidou o corretor {$invite->name} via {$via}.",
            actor: $actor,
            tenantId: $invite->tenant_id,
            resourceType: 'broker_invite',
            resourceId: $invite->id,
            newValues: [
                'name' => $invite->name,
                'email' => $invite->email,
                'phone' => $invite->phone,
                'channel' => $invite->channel->value,
            ],
        );
    }

    public function recordTenantCreated(User $actor, Tenant $tenant): void
    {
        $status = $tenant->active ? 'ativa' : 'inativa';

        $this->logger->record(
            action: UserActivityAction::TenantCreated,
            message: "Cadastrou a construtora {$tenant->name} (slug {$tenant->slug}, {$status}).",
            actor: $actor,
            tenantId: $tenant->id,
            resourceType: 'tenant',
            resourceId: $tenant->id,
            newValues: [
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'active' => $tenant->active,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     */
    public function recordTenantUpdated(User $actor, Tenant $tenant, array $oldValues, array $newValues): void
    {
        $status = $tenant->active ? 'ativa' : 'inativa';

        $this->logger->record(
            action: UserActivityAction::TenantUpdated,
            message: "Atualizou a construtora {$tenant->name} (slug {$tenant->slug}, {$status}).",
            actor: $actor,
            tenantId: $tenant->id,
            resourceType: 'tenant',
            resourceId: $tenant->id,
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }

    public function recordBrokerInviteRevoked(User $actor, BrokerInvite $invite): void
    {
        $this->logger->record(
            action: UserActivityAction::BrokerInviteRevoked,
            message: "Revogou o convite do corretor {$invite->name}.",
            actor: $actor,
            tenantId: $invite->tenant_id,
            resourceType: 'broker_invite',
            resourceId: $invite->id,
            oldValues: ['name' => $invite->name],
        );
    }

    public function recordBuildingAccessGranted(User $actor, BuildingAccess $access): void
    {
        $access->loadMissing(['building', 'broker']);

        $this->logger->record(
            action: UserActivityAction::BuildingAccessGranted,
            message: "Liberou o empreendimento {$this->buildingName($access->building)} para o corretor {$access->broker?->name}.",
            actor: $actor,
            tenantId: $access->tenant_id,
            resourceType: 'building_access',
            resourceId: $access->id,
            newValues: [
                'building_id' => $access->building_id,
                'broker_id' => $access->broker_id,
            ],
        );
    }

    public function recordBuildingAccessRevoked(User $actor, BuildingAccess $access): void
    {
        $access->loadMissing(['building', 'broker']);

        $this->logger->record(
            action: UserActivityAction::BuildingAccessRevoked,
            message: "Removeu o acesso do corretor {$access->broker?->name} ao empreendimento {$this->buildingName($access->building)}.",
            actor: $actor,
            tenantId: $access->tenant_id,
            resourceType: 'building_access',
            resourceId: $access->id,
            oldValues: [
                'building_id' => $access->building_id,
                'broker_id' => $access->broker_id,
            ],
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

    private function buildingName(?Building $building): string
    {
        $name = $building?->name;

        return $name !== null && $name !== '' ? $name : '#'.($building?->id ?? 0);
    }

    private function unitStatusLabel(UnitStatus $status): string
    {
        return match ($status) {
            UnitStatus::Available => 'disponível',
            UnitStatus::PreReserved => 'pré-reservada',
            UnitStatus::Reserved => 'reservada',
            UnitStatus::Sold => 'vendida',
            UnitStatus::Unavailable => 'indisponível',
        };
    }
}
