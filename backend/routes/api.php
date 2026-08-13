<?php

use App\Http\Controllers\Api\Admin\TenantController as AdminTenantController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Broker\BrokerInviteController as BrokerBrokerInviteController;
use App\Http\Controllers\Api\Broker\BrokerJoinController;
use App\Http\Controllers\Api\Broker\BrokerProfileController;
use App\Http\Controllers\Api\Broker\ClientController as BrokerClientController;
use App\Http\Controllers\Api\Broker\ReservationAttachmentController as BrokerReservationAttachmentController;
use App\Http\Controllers\Api\Broker\ReservationController;
use App\Http\Controllers\Api\Broker\ReservationDepositController as BrokerReservationDepositController;
use App\Http\Controllers\Api\Broker\ReservationMessageController as BrokerReservationMessageController;
use App\Http\Controllers\Api\Broker\ReservationProposalController as BrokerReservationProposalController;
use App\Http\Controllers\Api\Broker\ReservationTimelineController as BrokerReservationTimelineController;
use App\Http\Controllers\Api\Broker\UnitController as BrokerUnitController;
use App\Http\Controllers\Api\Broker\BuildingMediaController as BrokerBuildingMediaController;
use App\Http\Controllers\Api\Builder\BrokerController as BuilderBrokerController;
use App\Http\Controllers\Api\Builder\BrokerInviteController as BuilderBrokerInviteController;
use App\Http\Controllers\Api\Builder\TenantBrokerInviteLinkController;
use App\Http\Controllers\Api\Builder\BuildingAccessController;
use App\Http\Controllers\Api\Builder\BuildingController;
use App\Http\Controllers\Api\Builder\BuildingMediaController as BuilderBuildingMediaController;
use App\Http\Controllers\Api\Builder\TowerController;
use App\Http\Controllers\Api\Builder\ReservationAttachmentController as BuilderReservationAttachmentController;
use App\Http\Controllers\Api\Builder\ReservationController as BuilderReservationController;
use App\Http\Controllers\Api\Builder\ReservationDepositController as BuilderReservationDepositController;
use App\Http\Controllers\Api\Builder\ReservationMessageController as BuilderReservationMessageController;
use App\Http\Controllers\Api\Builder\ReservationProposalController as BuilderReservationProposalController;
use App\Http\Controllers\Api\Builder\ReservationTimelineController as BuilderReservationTimelineController;
use App\Http\Controllers\Api\Builder\TeamMemberController;
use App\Http\Controllers\Api\Builder\UnitController;
use App\Http\Controllers\Api\Public\BuildingController as PublicBuildingController;
use App\Http\Controllers\Api\Public\BuildingMediaController as PublicBuildingMediaController;
use App\Http\Controllers\Api\Public\PublicSeoController;
use App\Http\Controllers\Api\Public\WhatsAppWebhookController;
use App\Models\TenantNote;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'oportalimobiliario-api',
    ]);
});

Route::prefix('public')->group(function () {
    Route::get('/buildings', [PublicBuildingController::class, 'index']);
    Route::get('/buildings/{building:slug}', [PublicBuildingController::class, 'show']);
    Route::get('/buildings/{building:slug}/media', [PublicBuildingMediaController::class, 'index']);
    Route::get('/buildings/{building:slug}/media/{media}/file', [PublicBuildingMediaController::class, 'file']);
    Route::get('/sitemap.xml', [PublicSeoController::class, 'sitemap']);
    Route::get('/robots.txt', [PublicSeoController::class, 'robots']);
    Route::get('/whatsapp/webhook', [WhatsAppWebhookController::class, 'verify']);
    Route::post('/whatsapp/webhook', [WhatsAppWebhookController::class, 'handle']);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/impersonate/exchange', [AuthController::class, 'exchangeImpersonation']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::prefix('broker/invites')->group(function () {
    Route::get('/preview', [BrokerBrokerInviteController::class, 'preview']);
    Route::post('/accept', [BrokerBrokerInviteController::class, 'accept']);
});

Route::prefix('broker/join')->group(function () {
    Route::get('/preview', [BrokerJoinController::class, 'preview']);
    Route::post('/register', [BrokerJoinController::class, 'register']);
    Route::post('/resend-individual-invite', [BrokerJoinController::class, 'resendIndividualInvite']);
});

Route::middleware(['auth:sanctum', 'tenant.from.user', 'tenant.ensure', 'permissions.team', 'builder'])->prefix('builder')->group(function () {
    Route::get('/notes', function () {
        return TenantNote::query()->orderBy('id')->get();
    });

    Route::apiResource('buildings', BuildingController::class);
    Route::apiResource('buildings.towers', TowerController::class);
    Route::apiResource('buildings.units', UnitController::class);
    Route::get('/buildings/{building}/media', [BuilderBuildingMediaController::class, 'index']);
    Route::post('/buildings/{building}/media', [BuilderBuildingMediaController::class, 'store']);
    Route::patch('/buildings/{building}/media/{media}', [BuilderBuildingMediaController::class, 'update']);
    Route::delete('/buildings/{building}/media/{media}', [BuilderBuildingMediaController::class, 'destroy']);
    Route::get('/buildings/{building}/media/{media}/file', [BuilderBuildingMediaController::class, 'file']);

    Route::get('/invites', [BuilderBrokerInviteController::class, 'index']);
    Route::post('/invites', [BuilderBrokerInviteController::class, 'store']);
    Route::post('/invites/{invite}/resend', [BuilderBrokerInviteController::class, 'resend']);
    Route::post('/invites/{invite}/revoke', [BuilderBrokerInviteController::class, 'revoke']);
    Route::post('/invites/{invite}/reactivate', [BuilderBrokerInviteController::class, 'reactivate']);
    Route::delete('/invites/{invite}', [BuilderBrokerInviteController::class, 'destroy']);

    Route::get('/invite-link', [TenantBrokerInviteLinkController::class, 'show']);
    Route::post('/invite-link/regenerate', [TenantBrokerInviteLinkController::class, 'regenerate']);
    Route::get('/pending-brokers', [TenantBrokerInviteLinkController::class, 'pendingBrokers']);
    Route::post('/pending-brokers/{brokerTenant}/approve', [TenantBrokerInviteLinkController::class, 'approve']);
    Route::post('/pending-brokers/{brokerTenant}/reject', [TenantBrokerInviteLinkController::class, 'reject']);

    Route::get('/brokers', [BuilderBrokerController::class, 'index']);
    Route::get('/brokers/{broker}/buildings', [BuilderBrokerController::class, 'buildings']);
    Route::post('/brokers/{broker}/deactivate', [BuilderBrokerController::class, 'deactivate']);
    Route::post('/brokers/{broker}/reactivate', [BuilderBrokerController::class, 'reactivate']);
    Route::delete('/brokers/{broker}', [BuilderBrokerController::class, 'destroy']);
    Route::post('/brokers/{broker}/buildings', [BuildingAccessController::class, 'store']);
    Route::delete('/brokers/{broker}/buildings/{building}', [BuildingAccessController::class, 'destroy']);

    Route::apiResource('team', TeamMemberController::class)
        ->parameters(['team' => 'teamMember'])
        ->except(['show']);

    Route::get('/reservations', [BuilderReservationController::class, 'index']);
    Route::get('/reservations/pending-replies-count', [BuilderReservationController::class, 'pendingRepliesCount']);
    Route::delete('/reservations/{reservation}', [BuilderReservationController::class, 'destroy']);
    Route::get('/reservations/{reservation}/timeline', [BuilderReservationTimelineController::class, 'show']);
    Route::patch('/reservations/{reservation}/proposal/decision', [BuilderReservationProposalController::class, 'decide']);
    Route::patch('/reservations/{reservation}/deposit-proof/approve', [BuilderReservationDepositController::class, 'approve']);
    Route::get('/reservations/{reservation}/attachments/{attachment}/file', [BuilderReservationAttachmentController::class, 'file']);
    Route::get('/reservations/{reservation}/messages', [BuilderReservationMessageController::class, 'index']);
    Route::post('/reservations/{reservation}/messages', [BuilderReservationMessageController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'tenant.ensure.none', 'broker'])->prefix('broker')->group(function () {
    Route::get('/profile', [BrokerProfileController::class, 'show']);

    Route::middleware('broker.active')->group(function () {
        Route::get('/clients', [BrokerClientController::class, 'index']);
        Route::post('/clients', [BrokerClientController::class, 'store']);
        Route::get('/units', [BrokerUnitController::class, 'index']);
        Route::get('/buildings/{building}/media', [BrokerBuildingMediaController::class, 'index']);
        Route::get('/buildings/{building}/media/{media}/file', [BrokerBuildingMediaController::class, 'file']);
        Route::get('/reservations', [ReservationController::class, 'index']);
        Route::get('/reservations/pending-replies-count', [ReservationController::class, 'pendingRepliesCount']);
        Route::post('/reservations/pre-hold', [ReservationController::class, 'preHold']);
        Route::post('/reservations', [ReservationController::class, 'store']);
        Route::patch('/reservations/{reservation}/confirm', [ReservationController::class, 'confirm']);
        Route::post('/reservations/{reservation}/proposal', [BrokerReservationProposalController::class, 'store']);
        Route::post('/reservations/{reservation}/deposit-proof', [BrokerReservationDepositController::class, 'store']);
        Route::get('/reservations/{reservation}/attachments/{attachment}/file', [BrokerReservationAttachmentController::class, 'file']);
        Route::delete('/reservations/{reservation}/pre-hold', [ReservationController::class, 'releasePreHold']);
        Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy']);
        Route::get('/reservations/{reservation}/timeline', [BrokerReservationTimelineController::class, 'show']);
        Route::get('/reservations/{reservation}/messages', [BrokerReservationMessageController::class, 'index']);
        Route::post('/reservations/{reservation}/messages', [BrokerReservationMessageController::class, 'store']);
    });
});

Route::middleware(['auth:sanctum', 'tenant.ensure.none', 'admin'])->prefix('admin')->group(function () {
    Route::get('tenants/{tenant}/users', [AdminTenantController::class, 'users']);
    Route::post('tenants/{tenant}/impersonate', [AdminTenantController::class, 'impersonate']);
    Route::apiResource('tenants', AdminTenantController::class)->except(['destroy']);
});
