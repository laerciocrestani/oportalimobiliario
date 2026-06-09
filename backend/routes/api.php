<?php

use App\Http\Controllers\Api\AuthController;
use App\Models\TenantNote;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'oportalimobiliario-api',
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware(['auth:sanctum', 'tenant.from.user', 'tenant.ensure'])->prefix('construtora')->group(function () {
    Route::get('/notes', function () {
        return TenantNote::query()->orderBy('id')->get();
    });
});

Route::middleware(['auth:sanctum', 'tenant.ensure.none', 'corretor'])->prefix('corretor')->group(function () {
    Route::get('/profile', function () {
        return response()->json([
            'role' => 'corretor',
            'tenant_context' => false,
        ]);
    });
});
