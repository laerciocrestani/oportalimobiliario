<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Services\BrokerBuildingRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuildingRequestController extends Controller
{
    public function __construct(private BrokerBuildingRequestService $requests) {}

    public function store(Request $request, Building $building): JsonResponse
    {
        $result = $this->requests->request($request->user(), $building);

        return response()->json($result);
    }
}
