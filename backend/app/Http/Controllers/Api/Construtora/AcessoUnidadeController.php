<?php

namespace App\Http\Controllers\Api\Construtora;

use App\Http\Controllers\Controller;
use App\Models\AcessoUnidade;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-CONV-003
 */
class AcessoUnidadeController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'corretor_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'corretor')],
            'unidade_id' => ['required', 'integer', 'exists:unidades,id'],
        ]);

        $unidade = Unidade::query()->findOrFail($data['unidade_id']);

        $acesso = AcessoUnidade::query()->firstOrCreate([
            'corretor_id' => $data['corretor_id'],
            'unidade_id' => $unidade->id,
        ], [
            'tenant_id' => $unidade->tenant_id,
        ]);

        return response()->json($acesso->load('unidade'), 201);
    }

    public function destroy(AcessoUnidade $acesso): JsonResponse
    {
        $acesso->delete();

        return response()->json(null, 204);
    }
}
