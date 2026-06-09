<?php

namespace App\Tenancy\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCorretor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || $user->role !== 'corretor') {
            return response()->json(['message' => 'Corretor access required.'], 403);
        }

        return $next($request);
    }
}
