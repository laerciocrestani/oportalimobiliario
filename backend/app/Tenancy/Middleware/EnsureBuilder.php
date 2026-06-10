<?php

namespace App\Tenancy\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBuilder
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || $user->role !== 'builder') {
            return response()->json(['message' => 'Builder access required.'], 403);
        }

        return $next($request);
    }
}
