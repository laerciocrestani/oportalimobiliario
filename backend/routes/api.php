<?php

use App\Http\Controllers\Api\Admin\TenantController as AdminTenantController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Broker\BrokerInviteController as BrokerBrokerInviteController;
use App\Http\Controllers\Api\Broker\ReservationController;
use App\Http\Controllers\Api\Broker\UnitController as BrokerUnitController;
use App\Http\Controllers\Api\Builder\BrokerInviteController as BuilderBrokerInviteController;
use App\Http\Controllers\Api\Builder\BuildingController;
use App\Http\Controllers\Api\Builder\UnitAccessController;
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

Route::middleware(['auth:sanctum', 'tenant.from.user', 'tenant.ensure', 'builder'])->prefix('builder')->group(function () {
    Route::get('/notes', function () {
        return TenantNote::query()->orderBy('id')->get();
    });

    Route::apiResource('buildings', BuildingController::class);
    Route::apiResource('buildings.units', UnitController::class);

    Route::get('/invites', [BuilderBrokerInviteController::class, 'index']);
    Route::post('/invites', [BuilderBrokerInviteController::class, 'store']);
    Route::post('/access', [UnitAccessController::class, 'store']);
    Route::delete('/access/{access}', [UnitAccessController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'tenant.ensure.none', 'broker'])->prefix('broker')->group(function () {
    Route::get('/profile', function () {
        return response()->json([
            'role' => 'broker',
            'tenant_context' => false,
        ]);
    });

    Route::get('/units', [BrokerUnitController::class, 'index']);
    Route::post('/invites/accept', [BrokerBrokerInviteController::class, 'accept']);
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'tenant.ensure.none', 'admin'])->prefix('admin')->group(function () {
    Route::apiResource('tenants', AdminTenantController::class)->except(['destroy']);
});
