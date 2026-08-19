<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Services\BuildingDescriptionGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * @see REQ-WIZ-014
 */
class BuildingDescriptionController extends Controller
{
    public function store(Building $building, BuildingDescriptionGenerator $generator): JsonResponse
    {
        $this->authorize('update', $building);

        try {
            $description = $generator->generate($building);
        } catch (RuntimeException) {
            throw ValidationException::withMessages([
                'description' => 'Não foi possível gerar o descritivo agora. Tente de novo ou escreva manualmente.',
            ]);
        }

        return response()->json(['description' => $description]);
    }
}
