<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\InccIndexSource;
use App\Http\Controllers\Controller;
use App\Models\InccIndex;
use App\Services\BcbInccClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * @see REQ-WIZ-013
 */
class InccIndexController extends Controller
{
    public function index(): JsonResponse
    {
        $indices = InccIndex::query()
            ->orderByDesc('competence')
            ->get();

        return response()->json($indices);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'competence' => ['required', 'date'],
            'value' => ['required', 'numeric'],
        ]);

        $data['competence'] = $this->competenceMonth($data['competence']);
        $this->assertUniqueCompetence($data['competence']);

        $data['source'] = InccIndexSource::Manual;
        $data['fetched_at'] = null;

        $index = InccIndex::query()->create($data);

        return response()->json($index, 201);
    }

    public function update(Request $request, InccIndex $inccIndex): JsonResponse
    {
        $data = $request->validate([
            'competence' => ['sometimes', 'date'],
            'value' => ['sometimes', 'numeric'],
        ]);

        if (array_key_exists('competence', $data)) {
            $data['competence'] = $this->competenceMonth($data['competence']);
            $this->assertUniqueCompetence($data['competence'], $inccIndex->id);
        }

        $inccIndex->update($data);

        return response()->json($inccIndex->fresh());
    }

    public function hint(BcbInccClient $client): JsonResponse
    {
        try {
            $observation = $client->latest();
        } catch (RuntimeException) {
            return response()->json([
                'message' => 'Não foi possível consultar o INCC-M no Banco Central.',
            ], 503);
        }

        if ($observation === null) {
            return response()->json([
                'message' => 'Nenhuma observação retornada pelo Banco Central.',
            ], 404);
        }

        return response()->json([
            'competence' => $observation['competence'],
            'value' => $observation['value'],
            'is_index_number' => $client->isIndexNumber($observation['value']),
        ]);
    }

    private function competenceMonth(string $competence): string
    {
        return Carbon::parse($competence)->startOfMonth()->toDateString();
    }

    private function assertUniqueCompetence(string $competence, ?int $ignoreId = null): void
    {
        $query = InccIndex::query()->whereDate('competence', $competence);

        if ($ignoreId !== null) {
            $query->whereKeyNot($ignoreId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'competence' => __('validation.unique', ['attribute' => 'competence']),
            ]);
        }
    }
}
