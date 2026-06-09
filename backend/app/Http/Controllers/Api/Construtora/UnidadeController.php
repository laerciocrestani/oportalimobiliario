<?php

namespace App\Http\Controllers\Api\Construtora;

use App\Enums\UnidadeStatus;
use App\Http\Controllers\Controller;
use App\Models\Empreendimento;
use App\Models\Unidade;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-EMP-002
 * @see REQ-EMP-003
 */
class UnidadeController extends Controller
{
    public function index(Empreendimento $empreendimento): JsonResponse
    {
        return response()->json(
            $empreendimento->unidades()->orderBy('codigo')->get()
        );
    }

    public function store(Request $request, Empreendimento $empreendimento): JsonResponse
    {
        $data = $request->validate([
            'codigo' => [
                'required',
                'string',
                'max:50',
                Rule::unique('unidades', 'codigo')->where('empreendimento_id', $empreendimento->id),
            ],
            'andar' => ['nullable', 'integer', 'min:0'],
            'area_m2' => ['nullable', 'numeric', 'min:0'],
            'preco' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::enum(UnidadeStatus::class)],
        ]);

        $unidade = $empreendimento->unidades()->create($data);

        return response()->json($unidade->fresh(), 201);
    }

    public function show(Empreendimento $empreendimento, Unidade $unidade): JsonResponse
    {
        $this->ensureUnidadeBelongsToEmpreendimento($empreendimento, $unidade);

        return response()->json($unidade);
    }

    public function update(Request $request, Empreendimento $empreendimento, Unidade $unidade): JsonResponse
    {
        $this->ensureUnidadeBelongsToEmpreendimento($empreendimento, $unidade);

        $data = $request->validate([
            'codigo' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('unidades', 'codigo')
                    ->where('empreendimento_id', $empreendimento->id)
                    ->ignore($unidade->id),
            ],
            'andar' => ['nullable', 'integer', 'min:0'],
            'area_m2' => ['nullable', 'numeric', 'min:0'],
            'preco' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::enum(UnidadeStatus::class)],
        ]);

        $unidade->update($data);

        return response()->json($unidade->fresh());
    }

    public function destroy(Empreendimento $empreendimento, Unidade $unidade): JsonResponse
    {
        $this->ensureUnidadeBelongsToEmpreendimento($empreendimento, $unidade);

        $unidade->delete();

        return response()->json(null, 204);
    }

    private function ensureUnidadeBelongsToEmpreendimento(Empreendimento $empreendimento, Unidade $unidade): void
    {
        if ($unidade->empreendimento_id !== $empreendimento->id) {
            abort(404);
        }
    }
}
