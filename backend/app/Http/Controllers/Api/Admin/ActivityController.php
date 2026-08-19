<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserActivityAction;
use App\Http\Controllers\Controller;
use App\Services\UserActivityQuery;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * @see REQ-LOG-008
 */
class ActivityController extends Controller
{
    public function __construct(
        private readonly UserActivityQuery $activityQuery,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $this->validatedFilters($request);
        $filters = $this->filtersFromValidated($data);

        return response()->json($this->activityQuery->paginate(
            $filters,
            (int) ($data['per_page'] ?? 15),
        ));
    }

    public function export(Request $request): StreamedResponse
    {
        $data = $this->validatedFilters($request);
        $filters = $this->filtersFromValidated($data);
        $filename = sprintf(
            'atividade-%s-%s.csv',
            $filters['from']->toDateString(),
            $filters['to']->toDateString(),
        );

        return response()->streamDownload(function () use ($filters): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'created_at',
                'actor_id',
                'actor_name',
                'actor_email',
                'tenant_id',
                'action',
                'message',
                'resource_type',
                'resource_id',
            ]);

            foreach ($this->activityQuery->cursor($filters) as $event) {
                $row = $this->activityQuery->serialize($event);

                fputcsv($handle, [
                    $row['created_at'],
                    $row['actor_user_id'],
                    $row['actor']['name'] ?? '',
                    $row['actor']['email'] ?? '',
                    $row['tenant_id'],
                    $row['action'],
                    $row['message'],
                    $row['resource_type'],
                    $row['resource_id'],
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedFilters(Request $request): array
    {
        return $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'user_id' => ['sometimes', 'integer'],
            'tenant_id' => ['sometimes', 'integer'],
            'action' => ['sometimes', 'string', Rule::in(UserActivityAction::values())],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{
     *     from: CarbonImmutable,
     *     to: CarbonImmutable,
     *     actor_user_id: int|null,
     *     tenant_id: int|null,
     *     action: string|null
     * }
     */
    private function filtersFromValidated(array $data): array
    {
        return [
            ...$this->activityQuery->bounds($data['from'], $data['to']),
            'actor_user_id' => isset($data['user_id']) ? (int) $data['user_id'] : null,
            'tenant_id' => isset($data['tenant_id']) ? (int) $data['tenant_id'] : null,
            'action' => $data['action'] ?? null,
        ];
    }
}
