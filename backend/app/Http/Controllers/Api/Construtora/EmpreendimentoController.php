<?php

namespace App\Http\Controllers\Api\Construtora;

use App\Http\Controllers\Controller;
use App\Models\Empreendimento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-EMP-001
 * @see REQ-EMP-004
 */
class EmpreendimentoController extends Controller
{
    public function index(): JsonResponse
    {
        $empreendimentos = Empreendimento::query()
            ->withCount('unidades')
            ->orderBy('nome')
            ->get();

        return response()->json($empreendimentos);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'cidade' => ['nullable', 'string', 'max:255'],
            'estado' => ['nullable', 'string', 'size:2'],
            'publicado' => ['sometimes', 'boolean'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
        ]);

        $empreendimento = Empreendimento::query()->create($data);

        return response()->json($empreendimento, 201);
    }

    public function show(Empreendimento $empreendimento): JsonResponse
    {
        return response()->json($empreendimento->load('unidades'));
    }

    public function update(Request $request, Empreendimento $empreendimento): JsonResponse
    {
        $data = $request->validate([
            'nome' => ['sometimes', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'cidade' => ['nullable', 'string', 'max:255'],
            'estado' => ['nullable', 'string', 'size:2'],
            'publicado' => ['sometimes', 'boolean'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
        ]);

        $empreendimento->update($data);

        return response()->json($empreendimento->fresh());
    }

    public function destroy(Empreendimento $empreendimento): JsonResponse
    {
        $empreendimento->delete();

        return response()->json(null, 204);
    }
}
