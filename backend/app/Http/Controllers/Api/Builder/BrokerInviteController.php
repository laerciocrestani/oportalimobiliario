<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\BrokerInvite;
use App\Services\BrokerInviteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * @see REQ-CONV-001
 * @see REQ-CONV-009
 * @see REQ-CONV-010
 */
class BrokerInviteController extends Controller
{
    public function __construct(private BrokerInviteService $brokerInviteService) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', BrokerInvite::class);

        $invites = BrokerInvite::query()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (BrokerInvite $invite) => $this->formatInvite($invite));

        return response()->json($invites);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', BrokerInvite::class);

        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $invite = BrokerInvite::query()->create([
            'created_by' => $request->user()->id,
            'email' => $data['email'],
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ]);

        $this->brokerInviteService->sendEmail($invite);

        return response()->json($this->formatInvite($invite), 201);
    }

    public function resend(BrokerInvite $invite): JsonResponse
    {
        $this->authorize('resend', $invite);

        $invite = $this->brokerInviteService->resend($invite);

        return response()->json($this->formatInvite($invite));
    }

    public function destroy(BrokerInvite $invite): JsonResponse
    {
        $this->authorize('delete', $invite);

        $invite->delete();

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatInvite(BrokerInvite $invite): array
    {
        return [
            'id' => $invite->id,
            'email' => $invite->email,
            'token' => $invite->token,
            'status' => $this->brokerInviteService->status($invite),
            'broker_id' => $invite->broker_id,
            'accepted_at' => $invite->accepted_at?->toIso8601String(),
            'expires_at' => $invite->expires_at->toIso8601String(),
            'created_at' => $invite->created_at?->toIso8601String(),
            'invite_url' => $this->brokerInviteService->inviteUrl($invite),
        ];
    }
}
