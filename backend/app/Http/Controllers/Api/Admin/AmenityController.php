<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Amenity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * @see REQ-WIZ-010
 */
class AmenityController extends Controller
{
    public function index(): JsonResponse
    {
        $amenities = Amenity::query()
            ->orderBy('name')
            ->get();

        return response()->json($amenities);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->filled('slug') && is_string($request->input('name'))) {
            $request->merge(['slug' => Str::slug((string) $request->input('name'))]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'unique:amenities,slug'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $data['active'] = $data['active'] ?? true;
        $amenity = Amenity::query()->create($data);

        return response()->json($amenity, 201);
    }

    public function update(Request $request, Amenity $amenity): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $amenity->update($data);

        return response()->json($amenity->fresh());
    }
}
