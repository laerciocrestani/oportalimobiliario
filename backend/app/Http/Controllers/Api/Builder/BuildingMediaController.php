<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\BuildingMediaCategory;
use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\BuildingMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BuildingMediaController extends Controller
{
    public function index(Request $request, Building $building): JsonResponse
    {
        $this->authorize('update', $building);

        $validated = $request->validate([
            'category' => ['sometimes', Rule::enum(BuildingMediaCategory::class)],
        ]);

        $query = $building->media()->orderBy('sort_order')->orderBy('id');

        if (isset($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        $prefix = "/builder/buildings/{$building->id}/media";

        return response()->json(
            $query->get()->map(fn (BuildingMedia $media) => $media->toApiArray($prefix))
        );
    }

    public function store(Request $request, Building $building): JsonResponse
    {
        $this->authorize('update', $building);

        $validated = $request->validate([
            'file' => ['required', 'file'],
            'category' => ['required', Rule::enum(BuildingMediaCategory::class)],
            'published' => ['sometimes', 'boolean'],
        ]);

        $category = BuildingMediaCategory::from($validated['category']);
        $file = $request->file('file');

        $this->validateFileForCategory($file, $category);

        if ($category === BuildingMediaCategory::FloorPlan && ($validated['published'] ?? false)) {
            abort(422, 'Plantas não podem ser publicadas no portal.');
        }

        $building->loadMissing('tenant');

        $extension = $file->getClientOriginalExtension() ?: $file->extension();
        $path = sprintf(
            'buildings/%d/%d/%s.%s',
            $building->tenant_id,
            $building->id,
            Str::uuid(),
            $extension,
        );

        Storage::disk('local')->put($path, $file->get());

        $media = $building->media()->create([
            'category' => $category,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => (string) $file->getMimeType(),
            'size_bytes' => (int) $file->getSize(),
            'published' => $category->isPublicPublishable() && ($validated['published'] ?? false),
        ]);

        $prefix = "/builder/buildings/{$building->id}/media";

        return response()->json($media->toApiArray($prefix), 201);
    }

    public function update(Request $request, Building $building, BuildingMedia $media): JsonResponse
    {
        $this->ensureMediaBelongsToBuilding($building, $media);
        $this->authorize('update', $media);

        $validated = $request->validate([
            'published' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (array_key_exists('published', $validated)) {
            if ($media->category === BuildingMediaCategory::FloorPlan && $validated['published']) {
                abort(422, 'Plantas não podem ser publicadas no portal.');
            }

            if (! $media->category->isPublicPublishable()) {
                abort(422, 'Esta mídia não pode ser publicada no portal.');
            }
        }

        $media->update($validated);

        $prefix = "/builder/buildings/{$building->id}/media";

        return response()->json($media->fresh()->toApiArray($prefix));
    }

    public function destroy(Building $building, BuildingMedia $media): JsonResponse
    {
        $this->ensureMediaBelongsToBuilding($building, $media);
        $this->authorize('delete', $media);

        Storage::disk('local')->delete($media->path);
        $media->delete();

        return response()->json(null, 204);
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

    protected function validateFileForCategory(\Illuminate\Http\UploadedFile $file, BuildingMediaCategory $category): void
    {
        $mimeType = (string) $file->getMimeType();
        $sizeKb = (int) ceil($file->getSize() / 1024);

        if ($category === BuildingMediaCategory::FloorPlan) {
            $allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

            if (! in_array($mimeType, $allowed, true)) {
                abort(422, 'Formato inválido para planta. Use JPEG, PNG, WebP ou PDF.');
            }

            if ($sizeKb > 10_240) {
                abort(422, 'Arquivo excede o limite de 10MB.');
            }

            return;
        }

        $allowed = ['image/jpeg', 'image/png', 'image/webp'];

        if (! in_array($mimeType, $allowed, true)) {
            abort(422, 'Formato inválido. Use JPEG, PNG ou WebP.');
        }

        if ($sizeKb > 5_120) {
            abort(422, 'Imagem excede o limite de 5MB.');
        }
    }
}
