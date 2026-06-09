<?php

namespace App\Tenancy\Middleware;

use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * @see REQ-TEN-004
 */
class EnsureNoTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        if (TenantContext::has()) {
            return response()->json(['message' => 'Tenant context must not be set.'], 403);
        }

        return $next($request);
    }
}
