<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\ReservationMessage;
use App\Services\ReservationTimelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-BLD-RES-003
 */
class ReservationMessageController extends Controller
{
    public function __construct(
        private readonly ReservationTimelineService $timelineService,
    ) {}

    public function index(Reservation $reservation): JsonResponse
    {
        $this->authorize('viewMessages', $reservation);

        $messages = $reservation->messages()
            ->with('user')
            ->orderBy('created_at')
            ->get()
            ->map(fn (ReservationMessage $message) => $this->formatMessage($message));

        return response()->json($messages);
    }

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('reply', $reservation);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = $reservation->messages()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        $message->load('user');

        $this->timelineService->recordDialogue($reservation, $request->user());

        return response()->json($this->formatMessage($message), 201);
    }

    /**
     * @return array{id: int, body: string, created_at: mixed, author: array{id: int, name: string, role: string}}
     */
    private function formatMessage(ReservationMessage $message): array
    {
        return [
            'id' => $message->id,
            'body' => $message->body,
            'created_at' => $message->created_at,
            'author' => [
                'id' => $message->user->id,
                'name' => $message->user->name,
                'role' => $message->user->role,
            ],
        ];
    }
}
