<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\BrokerInvite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * @see REQ-CONV-001
 */
class BrokerInviteController extends Controller
{
    public function index(): JsonResponse
    {
        $invites = BrokerInvite::query()
            ->orderByDesc('created_at')
            ->get();

        return response()->json($invites);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $invite = BrokerInvite::query()->create([
            'created_by' => $request->user()->id,
            'email' => $data['email'],
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ]);

        return response()->json($invite, 201);
    }
}
