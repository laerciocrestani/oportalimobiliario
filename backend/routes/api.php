<?php

use App\Models\TenantNote;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'oportalimobiliario-api',
    ]);
});

Route::middleware(['auth', 'tenant.from.user', 'tenant.ensure'])->prefix('construtora')->group(function () {
    Route::get('/notes', function () {
        return TenantNote::query()->orderBy('id')->get();
    });
});

Route::middleware(['auth', 'tenant.ensure.none', 'corretor'])->prefix('corretor')->group(function () {
    Route::get('/profile', function () {
        return response()->json([
            'role' => 'corretor',
            'tenant_context' => false,
        ]);
    });
});
