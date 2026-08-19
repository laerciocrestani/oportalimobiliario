<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\UserActivityCatalog;
use App\Support\BuilderPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * @see REQ-ADM-001
 * @see REQ-ADM-002
 * @see REQ-ADM-003
 * @see REQ-LOG-003
 */
class TenantController extends Controller
{
    public function __construct(
        private readonly UserActivityCatalog $activityCatalog,
    ) {}

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

        $this->activityCatalog->recordTenantCreated($request->user(), $tenant);

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

        if ($data === []) {
            return response()->json($tenant);
        }

        $oldValues = $tenant->only(array_keys($data));
        $tenant->update($data);
        $fresh = $tenant->fresh() ?? $tenant;

        $this->activityCatalog->recordTenantUpdated($request->user(), $fresh, $oldValues, $data);

        return response()->json($fresh);
    }

    public function users(Tenant $tenant): JsonResponse
    {
        $members = User::query()
            ->where('tenant_id', $tenant->id)
            ->where('role', 'builder')
            ->orderBy('name')
            ->get()
            ->map(fn (User $member) => $this->formatBuilderMember($member));

        return response()->json($members);
    }

    public function impersonate(Request $request, Tenant $tenant): JsonResponse
    {
        if (! $tenant->active) {
            return response()->json(['message' => 'Tenant is inactive.'], 422);
        }

        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $user = User::query()->findOrFail($data['user_id']);

        if ($user->role !== 'builder' || $user->tenant_id !== $tenant->id) {
            return response()->json(['message' => 'Invalid builder user for this tenant.'], 422);
        }

        $code = Str::uuid()->toString();

        Cache::put("impersonate:{$code}", [
            'user_id' => $user->id,
            'admin_id' => $request->user()->id,
            'tenant_id' => $tenant->id,
        ], 60);

        $builderUrl = rtrim((string) config('opim.frontend_urls.builder'), '/');

        return response()->json([
            'redirect_url' => "{$builderUrl}/auth/impersonate?code={$code}",
            'expires_in' => 60,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatBuilderMember(User $member): array
    {
        return [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'permissions' => BuilderPermissions::namesFor($member),
        ];
    }
}
