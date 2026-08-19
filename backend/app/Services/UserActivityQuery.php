<?php

namespace App\Services;

use App\Enums\UserActivityAction;
use App\Models\UserActivityEvent;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\LazyCollection;

/**
 * @see REQ-LOG-006
 * @see REQ-LOG-007
 * @see REQ-LOG-008
 */
class UserActivityQuery
{
    /**
     * @param  array{
     *     from: CarbonImmutable,
     *     to: CarbonImmutable,
     *     actor_user_id?: int|null,
     *     tenant_id?: int|null,
     *     action?: string|null
     * }  $filters
     */
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return $this->baseQuery($filters)
            ->with(['actor:id,name,email'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->through(fn (UserActivityEvent $event) => $this->serialize($event));
    }

    /**
     * @param  array{
     *     from: CarbonImmutable,
     *     to: CarbonImmutable,
     *     actor_user_id?: int|null,
     *     tenant_id?: int|null,
     *     action?: string|null
     * }  $filters
     * @return LazyCollection<int, UserActivityEvent>
     */
    public function cursor(array $filters): LazyCollection
    {
        return $this->baseQuery($filters)
            ->with(['actor:id,name,email'])
            ->orderBy('id')
            ->lazyById();
    }

    /**
     * @return array{from: CarbonImmutable, to: CarbonImmutable}
     */
    public function bounds(string $from, string $to): array
    {
        return [
            'from' => $this->parseBound($from, endOfDay: false),
            'to' => $this->parseBound($to, endOfDay: true),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function serialize(UserActivityEvent $event): array
    {
        return [
            'id' => $event->id,
            'action' => $event->action instanceof UserActivityAction
                ? $event->action->value
                : $event->action,
            'message' => $event->message,
            'resource_type' => $event->resource_type,
            'resource_id' => $event->resource_id,
            'old_values' => $event->old_values,
            'new_values' => $event->new_values,
            'tenant_id' => $event->tenant_id,
            'actor_user_id' => $event->actor_user_id,
            'actor' => $event->actor === null ? null : [
                'id' => $event->actor->id,
                'name' => $event->actor->name,
                'email' => $event->actor->email,
            ],
            'impersonator_user_id' => $event->impersonator_user_id,
            'impersonated_user_id' => $event->impersonated_user_id,
            'created_at' => $event->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  array{
     *     from: CarbonImmutable,
     *     to: CarbonImmutable,
     *     actor_user_id?: int|null,
     *     tenant_id?: int|null,
     *     action?: string|null
     * }  $filters
     */
    private function baseQuery(array $filters): Builder
    {
        $query = UserActivityEvent::query()
            ->where('created_at', '>=', $filters['from'])
            ->where('created_at', '<=', $filters['to']);

        if (array_key_exists('actor_user_id', $filters) && $filters['actor_user_id'] !== null) {
            $query->where('actor_user_id', $filters['actor_user_id']);
        }

        if (array_key_exists('tenant_id', $filters) && $filters['tenant_id'] !== null) {
            $query->where('tenant_id', $filters['tenant_id']);
        }

        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        return $query;
    }

    private function parseBound(string $value, bool $endOfDay): CarbonImmutable
    {
        $parsed = CarbonImmutable::parse($value);

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return $parsed;
        }

        return $endOfDay ? $parsed->endOfDay() : $parsed->startOfDay();
    }
}
