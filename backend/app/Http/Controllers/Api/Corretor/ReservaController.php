<?php

namespace App\Http\Controllers\Api\Corretor;

use App\Enums\UnidadeStatus;
use App\Http\Controllers\Controller;
use App\Models\AcessoUnidade;
use App\Models\Reserva;
use App\Models\Unidade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RES-001
 */
class ReservaController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'unidade_id' => ['required', 'integer', 'exists:unidades,id'],
        ]);

        $corretor = $request->user();

        $acesso = AcessoUnidade::query()
            ->withoutGlobalScope('tenant')
            ->where('corretor_id', $corretor->id)
            ->where('unidade_id', $data['unidade_id'])
            ->first();

        if ($acesso === null) {
            return response()->json(['message' => 'Sem acesso a esta unidade.'], 403);
        }

        $ttlHours = (int) config('opim.reserva_ttl_hours', 48);

        $unidade = Unidade::query()
            ->withoutGlobalScope('tenant')
            ->findOrFail($data['unidade_id']);

        if ($unidade->status !== UnidadeStatus::Disponivel) {
            return response()->json(['message' => 'Unidade não disponível para reserva.'], 422);
        }

        $reserva = DB::transaction(function () use ($data, $corretor, $acesso, $ttlHours, $unidade) {
            $locked = Unidade::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($unidade->id);

            if ($locked->status !== UnidadeStatus::Disponivel) {
                abort(422, 'Unidade não disponível para reserva.');
            }

            $locked->update(['status' => UnidadeStatus::Reservada]);

            return Reserva::query()->create([
                'tenant_id' => $acesso->tenant_id,
                'unidade_id' => $locked->id,
                'corretor_id' => $corretor->id,
                'expires_at' => now()->addHours($ttlHours),
            ]);
        });

        return response()->json($reserva->load('unidade'), 201);
    }

    public function destroy(Request $request, Reserva $reserva): JsonResponse
    {
        if ($reserva->corretor_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        DB::transaction(function () use ($reserva) {
            $unidade = Unidade::query()
                ->withoutGlobalScope('tenant')
                ->lockForUpdate()
                ->findOrFail($reserva->unidade_id);

            $unidade->update(['status' => UnidadeStatus::Disponivel]);
            $reserva->delete();
        });

        return response()->json(null, 204);
    }
}
