<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Services\BrokerAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrokerProfileController extends Controller
{
    public function __construct(private BrokerAccessService $brokerAccessService) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json($this->brokerAccessService->profilePayload($request->user()));
    }
}
