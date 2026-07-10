<?php

namespace App\Tenancy\Middleware;

use App\Services\BrokerAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBrokerHasActiveAccess
{
    public function __construct(private BrokerAccessService $brokerAccessService) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || $user->role !== 'broker') {
            return response()->json(['message' => 'Broker access required.'], 403);
        }

        if ($this->brokerAccessService->hasActiveAccess($user)) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Seu acesso ao portal está restrito. Entre em contato com a construtora.',
            'access_status' => $this->brokerAccessService->accessStatus($user),
        ], 403);
    }
}
