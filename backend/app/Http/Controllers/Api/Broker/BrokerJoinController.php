<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Services\TenantBrokerInviteLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrokerJoinController extends Controller
{
    public function __construct(private TenantBrokerInviteLinkService $inviteLinkService) {}

    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        return response()->json($this->inviteLinkService->preview($data['token']));
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $result = $this->inviteLinkService->register(
            $data['token'],
            $data['name'],
            $data['phone'],
            $data['email'],
            $data['password'],
        );

        return response()->json($result, 201);
    }

    public function resendIndividualInvite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
        ]);

        return response()->json($this->inviteLinkService->resendIndividualInvite(
            $data['token'],
            $data['email'],
            $data['phone'],
        ));
    }
}
