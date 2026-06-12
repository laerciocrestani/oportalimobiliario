<?php

use App\Http\Controllers\Api\Admin\TenantController as AdminTenantController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Broker\BrokerInviteController as BrokerBrokerInviteController;
use App\Http\Controllers\Api\Broker\ClientController as BrokerClientController;
use App\Http\Controllers\Api\Broker\ReservationController;
use App\Http\Controllers\Api\Broker\UnitController as BrokerUnitController;
use App\Http\Controllers\Api\Builder\BrokerController as BuilderBrokerController;
use App\Http\Controllers\Api\Builder\BrokerInviteController as BuilderBrokerInviteController;
use App\Http\Controllers\Api\Builder\BuildingAccessController;
use App\Http\Controllers\Api\Builder\BuildingController;
use App\Http\Controllers\Api\Builder\TowerController;
use App\Http\Controllers\Api\Builder\ReservationController as BuilderReservationController;
use App\Http\Controllers\Api\Builder\TeamMemberController;
use App\Http\Controllers\Api\Builder\UnitController;
use App\Http\Controllers\Api\Public\BuildingController as PublicBuildingController;
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
    Route::get('/buildings/{id}', [PublicBuildingController::class, 'show']);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::prefix('broker/invites')->group(function () {
    Route::get('/preview', [BrokerBrokerInviteController::class, 'preview']);
    Route::post('/accept', [BrokerBrokerInviteController::class, 'accept']);
});

Route::middleware(['auth:sanctum', 'tenant.from.user', 'tenant.ensure', 'permissions.team', 'builder'])->prefix('builder')->group(function () {
    Route::get('/notes', function () {
        return TenantNote::query()->orderBy('id')->get();
    });

    Route::apiResource('buildings', BuildingController::class);
    Route::apiResource('buildings.towers', TowerController::class);
    Route::apiResource('buildings.units', UnitController::class);

    Route::get('/invites', [BuilderBrokerInviteController::class, 'index']);
    Route::post('/invites', [BuilderBrokerInviteController::class, 'store']);
    Route::post('/invites/{invite}/resend', [BuilderBrokerInviteController::class, 'resend']);
    Route::delete('/invites/{invite}', [BuilderBrokerInviteController::class, 'destroy']);

    Route::get('/brokers', [BuilderBrokerController::class, 'index']);
    Route::get('/brokers/{broker}/buildings', [BuilderBrokerController::class, 'buildings']);
    Route::post('/brokers/{broker}/buildings', [BuildingAccessController::class, 'store']);
    Route::delete('/brokers/{broker}/buildings/{building}', [BuildingAccessController::class, 'destroy']);

    Route::apiResource('team', TeamMemberController::class)
        ->parameters(['team' => 'teamMember'])
        ->except(['show']);

    Route::delete('/reservations/{reservation}', [BuilderReservationController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'tenant.ensure.none', 'broker'])->prefix('broker')->group(function () {
    Route::get('/profile', function () {
        return response()->json([
            'role' => 'broker',
            'tenant_context' => false,
        ]);
    });

    Route::get('/clients', [BrokerClientController::class, 'index']);
    Route::post('/clients', [BrokerClientController::class, 'store']);
    Route::get('/units', [BrokerUnitController::class, 'index']);
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'tenant.ensure.none', 'admin'])->prefix('admin')->group(function () {
    Route::apiResource('tenants', AdminTenantController::class)->except(['destroy']);
});
