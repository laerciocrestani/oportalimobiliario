<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\BuildingMedia;
use App\Policies\BuildingMediaPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BuildingMediaController extends Controller
{
    public function __construct(private BuildingMediaPolicy $policy) {}

    public function index(Request $request, Building $building): JsonResponse
    {
        if (! $this->policy->viewBrokerAny($request->user(), $building)) {
            abort(403);
        }

        $prefix = "/broker/buildings/{$building->id}/media";

        $media = $building->media()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (BuildingMedia $item) => $item->toApiArray($prefix));

        return response()->json($media);
    }

    public function file(Building $building, BuildingMedia $media): StreamedResponse
    {
        $this->ensureMediaBelongsToBuilding($building, $media);
        $this->authorize('view', $media);

        return Storage::disk('local')->response($media->path, $media->original_name, [
            'Content-Type' => $media->mime_type,
        ]);
    }

    protected function ensureMediaBelongsToBuilding(Building $building, BuildingMedia $media): void
    {
        if ((int) $media->building_id !== (int) $building->id) {
            abort(404);
        }
    }
}
