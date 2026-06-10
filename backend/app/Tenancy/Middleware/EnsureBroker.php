<?php

namespace App\Tenancy\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBroker
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || $user->role !== 'broker') {
            return response()->json(['message' => 'Broker access required.'], 403);
        }

        return $next($request);
    }
}
