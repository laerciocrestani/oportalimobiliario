<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\ReservationMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-BLD-RES-004
 */
class ReservationMessageController extends Controller
{
    public function index(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $messages = $reservation->messages()
            ->with('user')
            ->orderBy('created_at')
            ->get()
            ->map(fn (ReservationMessage $message) => $this->formatMessage($message));

        return response()->json($messages);
    }

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = $reservation->messages()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        $message->load('user');

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
