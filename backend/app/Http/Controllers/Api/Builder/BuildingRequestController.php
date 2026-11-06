<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\BrokerBuildingRequest;
use App\Models\TenantBrokerInviteLink;
use App\Services\BrokerBuildingRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuildingRequestController extends Controller
{
    public function __construct(private BrokerBuildingRequestService $requests) {}

    public function approve(Request $request, BrokerBuildingRequest $brokerBuildingRequest): JsonResponse
    {
        $this->authorize('approvePending', TenantBrokerInviteLink::class);

        $access = $this->requests->approve(
            $brokerBuildingRequest,
            $request->user()->tenant_id,
            $request->user(),
        );

        return response()->json([
            'id' => $access->broker_id,
            'building_id' => $access->building_id,
        ]);
    }

    public function reject(Request $request, BrokerBuildingRequest $brokerBuildingRequest): JsonResponse
    {
        $this->authorize('approvePending', TenantBrokerInviteLink::class);

        $this->requests->reject($brokerBuildingRequest, $request->user()->tenant_id);

        return response()->json(null, 204);
    }
}
