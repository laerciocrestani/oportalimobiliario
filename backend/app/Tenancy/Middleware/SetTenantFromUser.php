<?php

namespace App\Tenancy\Middleware;

use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * @see REQ-TEN-003
 */
class SetTenantFromUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && $user->tenant_id !== null) {
            TenantContext::set((int) $user->tenant_id);
        }

        return $next($request);
    }
}
