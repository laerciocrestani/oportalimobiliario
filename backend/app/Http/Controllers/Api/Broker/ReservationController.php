<?php

namespace App\Http\Controllers\Api\Broker;

use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\Unit;
use App\Services\BrokerUnitAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RES-001
 */
class ReservationController extends Controller
{
    public function __construct(
        private readonly BrokerUnitAccessService $brokerUnitAccessService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'client_id' => ['required', 'integer', 'exists:broker_clients,id'],
        ]);

        $broker = $request->user();

        $client = BrokerClient::query()
            ->where('id', $data['client_id'])
            ->where('broker_id', $broker->id)
            ->first();

        if ($client === null) {
            return response()->json(['message' => 'Client not found.'], 403);
        }

        $unit = Unit::query()
            ->withoutGlobalScope('tenant')
            ->findOrFail($data['unit_id']);

        $access = $this->brokerUnitAccessService->resolveAccess($broker, $unit);

        if ($access === null) {
            return response()->json(['message' => 'No access to this unit.'], 403);
        }

        if ($unit->status !== UnitStatus::Available) {
            return response()->json(['message' => 'Unit not available for reservation.'], 422);
        }

        $ttlHours = (int) config('opim.reservation_ttl_hours', 48);

        $reservation = DB::transaction(function () use ($data, $broker, $access, $ttlHours, $unit, $client) {
            $locked = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($unit->id);

            if ($locked->status !== UnitStatus::Available) {
                abort(422, 'Unit not available for reservation.');
            }

            $locked->update(['status' => UnitStatus::Reserved]);

            return Reservation::query()->create([
                'tenant_id' => $access['tenant_id'],
                'unit_id' => $locked->id,
                'broker_id' => $broker->id,
                'client_id' => $client->id,
                'expires_at' => now()->addHours($ttlHours),
            ]);
        });

        return response()->json($reservation->load(['unit', 'client']), 201);
    }

    public function destroy(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        DB::transaction(function () use ($reservation) {
            $unit = Unit::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($reservation->unit_id);

            $unit->update(['status' => UnitStatus::Available]);
            $reservation->delete();
        });

        return response()->json(null, 204);
    }
}
