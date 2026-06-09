<?php

namespace App\Tenancy\Middleware;

use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! TenantContext::has()) {
            return response()->json(['message' => 'Tenant context required.'], 403);
        }

        return $next($request);
    }
}
