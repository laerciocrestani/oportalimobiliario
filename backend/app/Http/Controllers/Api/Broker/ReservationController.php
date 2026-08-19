<?php

namespace App\Http\Controllers\Api\Broker;

use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Http\Controllers\Controller;
use App\Models\BrokerClient;
use App\Models\Reservation;
use App\Models\Unit;
use App\Services\BrokerUnitAccessService;
use App\Services\PreReservationService;
use App\Services\ReservationCancellationService;
use App\Services\ReservationPendingReplyService;
use App\Services\ReservationProposalService;
use App\Services\ReservationTimelineService;
use App\Services\UserActivityCatalog;
use App\Support\ReservationCancelRules;
use App\Support\ReservationProposalRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RES-001
 * @see REQ-RES-005
 * @see REQ-BLD-RES-006
 */
class ReservationController extends Controller
{
    public function __construct(
        private readonly BrokerUnitAccessService $brokerUnitAccessService,
        private readonly PreReservationService $preReservationService,
        private readonly ReservationCancellationService $cancellationService,
        private readonly ReservationPendingReplyService $reservationPendingReplyService,
        private readonly ReservationProposalService $proposalService,
        private readonly ReservationTimelineService $timelineService,
        private readonly UserActivityCatalog $activityCatalog,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $broker = $request->user();

        $reservations = Reservation::query()
            ->withoutGlobalScope('tenant')
            ->listed()
            ->where('broker_id', $broker->id)
            ->with(['client', 'unit.building', 'timelineEvents', 'messages', 'proposals'])
            ->withCount('messages')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Reservation $reservation) => $this->reservationPendingReplyService->formatListItem($reservation, $broker));

        return response()->json($reservations);
    }

    public function pendingRepliesCount(Request $request): JsonResponse
    {
        return response()->json([
            'count' => $this->reservationPendingReplyService->countForBroker($request->user()),
        ]);
    }

    public function preHold(Request $request): JsonResponse
    {
        $data = $request->validate([
            'unit_id' => ['required', 'integer', 'exists:units,id'],
        ]);

        $broker = $request->user();
        $unit = Unit::query()
            ->withoutGlobalScope('tenant')
            ->findOrFail($data['unit_id']);

        $access = $this->brokerUnitAccessService->resolveAccess($broker, $unit);

        if ($access === null) {
            return response()->json(['message' => 'No access to this unit.'], 403);
        }

        if ($unit->status !== UnitStatus::Available) {
            return response()->json([
                'message' => 'Esta unidade acaba de ser pré-reservada por outro corretor.',
            ], 422);
        }

        $reservation = $this->preReservationService->createPreHold($broker, $unit, $access);

        return response()->json($reservation->load('unit'), 201);
    }

    /** Legacy alias of POST /broker/reservations/{reservation}/proposal. */
    public function confirm(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate(ReservationProposalRules::submit());

        $updated = $this->proposalService->submit($request->user(), $reservation, $data);

        return response()->json($updated->load(['unit', 'proposals']));
    }

    public function releasePreHold(Request $request, Reservation $reservation): JsonResponse
    {
        $this->preReservationService->releasePreHold($request->user(), $reservation);

        return response()->json(null, 204);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'client_id' => ['required', 'integer', 'exists:broker_clients,id'],
            'observations' => ['nullable', 'string', 'max:2000'],
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

            $reservation = Reservation::query()->create([
                'tenant_id' => $access['tenant_id'],
                'unit_id' => $locked->id,
                'broker_id' => $broker->id,
                'client_id' => $client->id,
                'status' => ReservationStatus::DepositPending,
                'expires_at' => now()->addHours($ttlHours),
            ]);

            $observations = trim((string) ($data['observations'] ?? ''));

            if ($observations !== '') {
                $reservation->messages()->create([
                    'user_id' => $broker->id,
                    'body' => $observations,
                ]);
            }

            return $reservation;
        });

        $this->timelineService->recordDepositWindowOpened($reservation);
        $this->activityCatalog->recordReservationCreated($broker, $reservation);

        $observations = trim((string) ($data['observations'] ?? ''));

        if ($observations !== '') {
            $this->timelineService->recordDialogue($reservation, $broker);
            $this->activityCatalog->recordMessageSent($broker, $reservation, $observations);
        }

        return response()->json($reservation->load(['unit', 'client']), 201);
    }

    public function destroy(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($reservation->isPreHold()) {
            $this->preReservationService->releasePreHold($request->user(), $reservation);

            return response()->json(null, 204);
        }

        $data = $request->validate(ReservationCancelRules::payload());

        $this->cancellationService->cancel($request->user(), $reservation, $data['reason']);

        return response()->json(null, 204);
    }
}
