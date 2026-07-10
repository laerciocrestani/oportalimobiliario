<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Services\BrokerInviteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-CONV-002
 * @see REQ-CONV-008
 * @see REQ-WA-005
 */
class BrokerInviteController extends Controller
{
    public function __construct(private BrokerInviteService $brokerInviteService) {}

    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        return response()->json($this->brokerInviteService->preview($data['token']));
    }

    public function accept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $authenticatedBroker = $request->user();
        if ($authenticatedBroker !== null && $authenticatedBroker->role !== 'broker') {
            $authenticatedBroker = null;
        }

        $result = $this->brokerInviteService->accept(
            $data['token'],
            $data['name'] ?? null,
            $data['password'] ?? null,
            $data['email'] ?? null,
            $authenticatedBroker,
        );

        return response()->json($result);
    }
}
