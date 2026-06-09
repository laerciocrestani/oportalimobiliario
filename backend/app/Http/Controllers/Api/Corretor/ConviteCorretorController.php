<?php

namespace App\Http\Controllers\Api\Corretor;

use App\Http\Controllers\Controller;
use App\Models\AcessoUnidade;
use App\Models\ConviteCorretor;
use App\Models\Unidade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-CONV-002
 * @see REQ-CONV-004
 */
class ConviteCorretorController extends Controller
{
    public function accept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $corretor = $request->user();

        $convite = ConviteCorretor::query()
            ->withoutGlobalScope('tenant')
            ->where('token', $data['token'])
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($convite === null) {
            return response()->json(['message' => 'Convite inválido ou expirado.'], 422);
        }

        if (strcasecmp($convite->email, $corretor->email) !== 0) {
            return response()->json(['message' => 'Convite não pertence a este corretor.'], 403);
        }

        $convite->update([
            'corretor_id' => $corretor->id,
            'accepted_at' => now(),
        ]);

        return response()->json($convite->fresh());
    }
}
