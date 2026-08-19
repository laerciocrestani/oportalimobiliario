<?php

namespace App\Enums;

enum UserActivityAction: string
{
    case AuthLogin = 'auth.login';
    case AuthLogout = 'auth.logout';
    case AuthLoginFailed = 'auth.login_failed';

    case ImpersonateStart = 'impersonate.start';
    case ImpersonateStop = 'impersonate.stop';

    case ClientCreated = 'client.created';
    case ClientUpdated = 'client.updated';
    case ClientDeleted = 'client.deleted';

    case ReservationPreHoldCreated = 'reservation.pre_hold.created';
    case ReservationPreHoldCancelled = 'reservation.pre_hold.cancelled';
    case ReservationPreHoldConfirmed = 'reservation.pre_hold.confirmed';
    case ReservationCreated = 'reservation.created';
    case ReservationCancelled = 'reservation.cancelled';
    case ReservationMessageSent = 'reservation.message.sent';
    case ReservationProposalSubmitted = 'reservation.proposal.submitted';
    case ReservationProposalAccepted = 'reservation.proposal.accepted';
    case ReservationProposalRejected = 'reservation.proposal.rejected';
    case ReservationProposalReturned = 'reservation.proposal.returned';
    case ReservationDepositProofSubmitted = 'reservation.deposit_proof.submitted';
    case ReservationDepositProofApproved = 'reservation.deposit_proof.approved';
    case ReservationContractDataSubmitted = 'reservation.contract_data.submitted';
    case ReservationContractIssued = 'reservation.contract.issued';
    case ReservationContractUploaded = 'reservation.contract.uploaded';
    case ReservationContractValidated = 'reservation.contract.validated';
    case ReservationSold = 'reservation.sold';

    case BuildingCreated = 'building.created';
    case BuildingUpdated = 'building.updated';
    case BuildingDeleted = 'building.deleted';
    case BuildingPublished = 'building.published';
    case TowerCreated = 'tower.created';
    case TowerUpdated = 'tower.updated';
    case TowerDeleted = 'tower.deleted';
    case UnitCreated = 'unit.created';
    case UnitUpdated = 'unit.updated';
    case UnitDeleted = 'unit.deleted';
    case UnitStatusChanged = 'unit.status_changed';

    case TeamMemberCreated = 'team.member.created';
    case TeamMemberUpdated = 'team.member.updated';
    case TeamMemberDeleted = 'team.member.deleted';
    case BrokerInviteCreated = 'broker_invite.created';
    case BrokerInviteRevoked = 'broker_invite.revoked';
    case BuildingAccessGranted = 'building_access.granted';
    case BuildingAccessRevoked = 'building_access.revoked';

    case TenantCreated = 'tenant.created';
    case TenantUpdated = 'tenant.updated';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
