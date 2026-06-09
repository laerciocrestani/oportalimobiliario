<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * @see REQ-ADM-001
 * @see REQ-ADM-002
 * @see REQ-ADM-003
 */
class TenantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenants = Tenant::query()
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return response()->json($tenants);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:tenants,slug'],
            'active' => ['sometimes', 'boolean'],
        ]);

        if (! isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(4));
        }

        $tenant = Tenant::query()->create($data);

        return response()->json($tenant, 201);
    }

    public function show(Tenant $tenant): JsonResponse
    {
        return response()->json($tenant->loadCount('users'));
    }

    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('tenants', 'slug')->ignore($tenant->id)],
            'active' => ['sometimes', 'boolean'],
        ]);

        $tenant->update($data);

        return response()->json($tenant->fresh());
    }
}
