<?php

namespace App\Tenancy\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureConstrutora
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || $user->role !== 'construtora') {
            return response()->json(['message' => 'Construtora access required.'], 403);
        }

        return $next($request);
    }
}
