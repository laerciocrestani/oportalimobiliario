<?php

namespace App\Tenancy\Middleware;

use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForgetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            return $next($request);
        } finally {
            TenantContext::forget();
        }
    }
}
