<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\InccIndex;
use Illuminate\Http\JsonResponse;

/**
 * Read-only INCC-M catalog so the builder can preview the unit price.
 *
 * @see REQ-WIZ-011
 * @see REQ-WIZ-012
 */
class InccIndexController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Building::class);

        $indices = InccIndex::query()
            ->whereNotNull('value')
            ->orderByDesc('competence')
            ->get(['competence', 'value']);

        return response()->json($indices);
    }
}
