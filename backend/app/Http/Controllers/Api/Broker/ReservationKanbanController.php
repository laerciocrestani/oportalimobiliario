<?php

namespace App\Http\Controllers\Api\Broker;

use App\Enums\ReservationKanbanColumn;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationKanbanService;
use App\Services\ReservationPendingReplyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-RPF-016
 * @see REQ-RPF-017
 */
class ReservationKanbanController extends Controller
{
    public function __construct(
        private readonly ReservationKanbanService $kanbanService,
        private readonly ReservationPendingReplyService $pendingReplyService,
    ) {}

    public function update(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'column' => ['required', 'string', Rule::enum(ReservationKanbanColumn::class)],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $updated = $this->kanbanService->move(
            $request->user(),
            $reservation,
            ReservationKanbanColumn::from($data['column']),
            $data['reason'] ?? null,
        );

        if ($updated === null) {
            return response()->json(null, 204);
        }

        $updated->load([
            'client',
            'broker',
            'unit.building',
            'timelineEvents',
            'messages.user',
            'proposals',
            'attachments',
            'witnesses',
        ]);

        return response()->json(
            $this->pendingReplyService->formatListItem($updated, $request->user()),
        );
    }
}
