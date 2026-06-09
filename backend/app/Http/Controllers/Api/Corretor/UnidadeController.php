<?php

namespace App\Http\Controllers\Api\Corretor;

use App\Http\Controllers\Controller;
use App\Models\AcessoUnidade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-CONV-004
 */
class UnidadeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $unidadeIds = AcessoUnidade::query()
            ->withoutGlobalScope('tenant')
            ->where('corretor_id', $request->user()->id)
            ->pluck('unidade_id');

        $unidades = \App\Models\Unidade::query()
            ->withoutGlobalScope('tenant')
            ->with('empreendimento')
            ->whereIn('id', $unidadeIds)
            ->orderBy('codigo')
            ->get();

        return response()->json($unidades);
    }
}
