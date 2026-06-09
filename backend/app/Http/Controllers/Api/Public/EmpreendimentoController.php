<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Empreendimento;
use Illuminate\Http\JsonResponse;

/**
 * @see REQ-PUB-001
 * @see REQ-PUB-002
 */
class EmpreendimentoController extends Controller
{
    public function index(): JsonResponse
    {
        $empreendimentos = Empreendimento::query()
            ->where('publicado', true)
            ->withCount('unidades')
            ->orderBy('nome')
            ->get(['id', 'nome', 'descricao', 'cidade', 'estado', 'seo_title', 'seo_description']);

        return response()->json($empreendimentos);
    }

    public function show(int $id): JsonResponse
    {
        $empreendimento = Empreendimento::query()
            ->where('publicado', true)
            ->with(['unidades' => fn ($q) => $q->where('status', 'disponivel')])
            ->findOrFail($id);

        return response()->json($empreendimento);
    }
}
