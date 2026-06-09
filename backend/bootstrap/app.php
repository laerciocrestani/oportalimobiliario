<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'tenant.from.user' => \App\Tenancy\Middleware\SetTenantFromUser::class,
            'tenant.ensure' => \App\Tenancy\Middleware\EnsureTenantContext::class,
            'tenant.ensure.none' => \App\Tenancy\Middleware\EnsureNoTenantContext::class,
            'corretor' => \App\Tenancy\Middleware\EnsureCorretor::class,
        ]);

        $middleware->append(\App\Tenancy\Middleware\ForgetTenantContext::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
