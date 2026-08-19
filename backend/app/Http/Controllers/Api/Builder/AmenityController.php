<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Amenity;
use App\Models\Building;
use Illuminate\Http\JsonResponse;

/**
 * @see REQ-WIZ-010
 */
class AmenityController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Building::class);

        $amenities = Amenity::query()
            ->active()
            ->orderBy('name')
            ->get();

        return response()->json($amenities);
    }
}
