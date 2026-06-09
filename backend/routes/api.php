<?php

use App\Http\Controllers\Api\Admin\TenantController as AdminTenantController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Construtora\AcessoUnidadeController;
use App\Http\Controllers\Api\Construtora\ConviteCorretorController as ConstrutoraConviteController;
use App\Http\Controllers\Api\Construtora\EmpreendimentoController;
use App\Http\Controllers\Api\Construtora\UnidadeController;
use App\Http\Controllers\Api\Corretor\ConviteCorretorController as CorretorConviteController;
use App\Http\Controllers\Api\Corretor\ReservaController;
use App\Http\Controllers\Api\Corretor\UnidadeController as CorretorUnidadeController;
use App\Http\Controllers\Api\Public\EmpreendimentoController as PublicEmpreendimentoController;
use App\Models\TenantNote;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'oportalimobiliario-api',
    ]);
});

Route::prefix('public')->group(function () {
    Route::get('/empreendimentos', [PublicEmpreendimentoController::class, 'index']);
    Route::get('/empreendimentos/{id}', [PublicEmpreendimentoController::class, 'show']);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware(['auth:sanctum', 'tenant.from.user', 'tenant.ensure', 'construtora'])->prefix('construtora')->group(function () {
    Route::get('/notes', function () {
        return TenantNote::query()->orderBy('id')->get();
    });

    Route::apiResource('empreendimentos', EmpreendimentoController::class);
    Route::apiResource('empreendimentos.unidades', UnidadeController::class);

    Route::get('/convites', [ConstrutoraConviteController::class, 'index']);
    Route::post('/convites', [ConstrutoraConviteController::class, 'store']);
    Route::post('/acessos', [AcessoUnidadeController::class, 'store']);
    Route::delete('/acessos/{acesso}', [AcessoUnidadeController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'tenant.ensure.none', 'corretor'])->prefix('corretor')->group(function () {
    Route::get('/profile', function () {
        return response()->json([
            'role' => 'corretor',
            'tenant_context' => false,
        ]);
    });

    Route::get('/unidades', [CorretorUnidadeController::class, 'index']);
    Route::post('/convites/accept', [CorretorConviteController::class, 'accept']);
    Route::post('/reservas', [ReservaController::class, 'store']);
    Route::delete('/reservas/{reserva}', [ReservaController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'tenant.ensure.none', 'admin'])->prefix('admin')->group(function () {
    Route::apiResource('tenants', AdminTenantController::class)->except(['destroy']);
});
