<?php

namespace App\Http\Controllers\Api\Public;

use App\Enums\BuildingMediaCategory;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\BuildingMedia;
use App\Policies\BuildingMediaPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BuildingMediaController extends Controller
{
    public function index(int $id): JsonResponse
    {
        $building = Building::query()
            ->where('published', true)
            ->findOrFail($id);

        $prefix = "/public/buildings/{$building->id}/media";

        $media = $building->media()
            ->whereIn('category', BuildingMediaCategory::publicCategories())
            ->where('published', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (BuildingMedia $item) => $item->toApiArray($prefix));

        return response()->json($media);
    }

    public function file(int $id, BuildingMedia $media): StreamedResponse
    {
        $building = Building::query()
            ->where('published', true)
            ->findOrFail($id);

        if ((int) $media->building_id !== (int) $building->id) {
            abort(404);
        }

        if (! app(BuildingMediaPolicy::class)->viewPublic($media)) {
            abort(404);
        }

        return Storage::disk('local')->response($media->path, $media->original_name, [
            'Content-Type' => $media->mime_type,
        ]);
    }
}
