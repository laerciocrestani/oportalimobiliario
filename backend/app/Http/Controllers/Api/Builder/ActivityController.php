<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserActivityQuery;
use App\Support\BuilderPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-LOG-007
 * @see REQ-LOG-009
 * @see REQ-LOG-010
 */
class ActivityController extends Controller
{
    public function __construct(
        private readonly UserActivityQuery $activityQuery,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'user_id' => ['sometimes', 'integer'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $actor = $this->resolveActor($request);
        $bounds = $this->activityQuery->bounds($data['from'], $data['to']);

        return response()->json($this->activityQuery->paginate([
            ...$bounds,
            'actor_user_id' => $actor->id,
            'tenant_id' => $request->user()->tenant_id,
        ], (int) ($data['per_page'] ?? 15)));
    }

    public function members(Request $request): JsonResponse
    {
        abort_unless($request->user()->can(BuilderPermissions::VIEW_AUDIT), 403);

        $members = User::query()
            ->where('role', 'builder')
            ->where('tenant_id', $request->user()->tenant_id)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return response()->json($members);
    }

    private function resolveActor(Request $request): User
    {
        $auth = $request->user();

        if (! $request->filled('user_id') || (int) $request->input('user_id') === $auth->id) {
            return $auth;
        }

        abort_unless($auth->can(BuilderPermissions::VIEW_AUDIT), 403);

        $target = User::query()->find((int) $request->input('user_id'));

        abort_unless(
            $target !== null
                && $target->role === 'builder'
                && $target->tenant_id !== null
                && (int) $target->tenant_id === (int) $auth->tenant_id,
            403,
        );

        return $target;
    }
}
