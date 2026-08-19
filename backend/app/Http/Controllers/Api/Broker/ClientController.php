<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\BrokerClient;
use App\Services\UserActivityCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function __construct(
        private readonly UserActivityCatalog $activityCatalog,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $clients = BrokerClient::query()
            ->where('broker_id', $request->user()->id)
            ->orderBy('name')
            ->get();

        return response()->json($clients);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $client = BrokerClient::query()->create([
            ...$data,
            'broker_id' => $request->user()->id,
        ]);

        $this->activityCatalog->recordClientCreated($request->user(), $client);

        return response()->json($client, 201);
    }
}
