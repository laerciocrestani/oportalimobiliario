<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Services\UserActivityQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-LOG-006
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
            'tenant_id' => ['sometimes', 'integer'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        abort_if(
            $request->filled('user_id') && (int) $request->input('user_id') !== $request->user()->id,
            403,
        );

        $bounds = $this->activityQuery->bounds($data['from'], $data['to']);

        return response()->json($this->activityQuery->paginate([
            ...$bounds,
            'actor_user_id' => $request->user()->id,
            'tenant_id' => isset($data['tenant_id']) ? (int) $data['tenant_id'] : null,
        ], (int) ($data['per_page'] ?? 15)));
    }
}
