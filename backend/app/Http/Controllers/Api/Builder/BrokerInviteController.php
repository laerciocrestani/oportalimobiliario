<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\BrokerInviteChannel;
use App\Http\Controllers\Controller;
use App\Models\BrokerInvite;
use App\Services\BrokerInviteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * @see REQ-CONV-001
 * @see REQ-CONV-009
 * @see REQ-CONV-010
 * @see REQ-WA-001
 * @see REQ-WA-002
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
            'name' => ['required', 'string', 'max:255'],
            'channel' => ['required', Rule::enum(BrokerInviteChannel::class)],
            'email' => ['required_if:channel,email', 'nullable', 'email', 'max:255'],
            'phone' => ['required_if:channel,whatsapp', 'nullable', 'string', 'max:30'],
        ]);

        $channel = BrokerInviteChannel::from($data['channel']);
        $phone = $this->brokerInviteService->normalizePhone($data['phone'] ?? null);

        if ($channel === BrokerInviteChannel::WhatsApp && $phone === null) {
            throw ValidationException::withMessages([
                'phone' => ['Informe um telefone válido com DDD.'],
            ]);
        }

        $invite = BrokerInvite::query()->create([
            'created_by' => $request->user()->id,
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $phone,
            'channel' => $channel,
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ]);

        $this->brokerInviteService->dispatch($invite);

        return response()->json($this->formatInvite($invite->fresh()), 201);
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
            'name' => $invite->name,
            'email' => $invite->email,
            'phone' => $invite->phone,
            'channel' => $invite->channel->value,
            'token' => $invite->token,
            'status' => $this->brokerInviteService->status($invite),
            'delivery_status' => $invite->delivery_status?->value,
            'broker_id' => $invite->broker_id,
            'accepted_at' => $invite->accepted_at?->toIso8601String(),
            'expires_at' => $invite->expires_at->toIso8601String(),
            'created_at' => $invite->created_at?->toIso8601String(),
            'invite_url' => $this->brokerInviteService->inviteUrl($invite),
        ];
    }
}
