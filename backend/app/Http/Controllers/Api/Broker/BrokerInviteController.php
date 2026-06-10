<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\BrokerInvite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-CONV-002
 * @see REQ-CONV-004
 */
class BrokerInviteController extends Controller
{
    public function accept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $broker = $request->user();

        $invite = BrokerInvite::query()
            ->withoutGlobalScope('tenant')
            ->where('token', $data['token'])
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($invite === null) {
            return response()->json(['message' => 'Invalid or expired invite.'], 422);
        }

        if (strcasecmp($invite->email, $broker->email) !== 0) {
            return response()->json(['message' => 'Invite does not belong to this broker.'], 403);
        }

        $invite->update([
            'broker_id' => $broker->id,
            'accepted_at' => now(),
        ]);

        return response()->json($invite->fresh());
    }
}
