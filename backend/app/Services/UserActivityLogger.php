<?php

namespace App\Services;

use App\Enums\UserActivityAction;
use App\Models\User;
use App\Models\UserActivityEvent;

/**
 * @see REQ-LOG-001
 * @see REQ-LOG-002
 * @see REQ-LOG-005
 */
class UserActivityLogger
{
    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    public function record(
        UserActivityAction $action,
        string $message,
        ?User $actor = null,
        ?int $tenantId = null,
        ?string $resourceType = null,
        ?int $resourceId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int $impersonatorUserId = null,
    ): void {
        $impersonatorId = $this->resolveImpersonatorId($actor, $impersonatorUserId);
        $impersonator = $impersonatorId !== null
            ? User::query()->find($impersonatorId)
            : null;

        $actorMessage = $message;
        $adminMessage = $message;

        if ($actor !== null && $impersonator !== null) {
            $actorMessage = "{$message} (impersonado por {$impersonator->name} #{$impersonator->id})";
            $adminMessage = "{$message} (em nome de {$actor->name} #{$actor->id})";
        }

        $this->insert(
            action: $action,
            message: $actorMessage,
            actorUserId: $actor?->id,
            tenantId: $tenantId,
            resourceType: $resourceType,
            resourceId: $resourceId,
            oldValues: $oldValues,
            newValues: $newValues,
            impersonatorUserId: $impersonator?->id,
            impersonatedUserId: null,
        );

        if ($actor === null || $impersonator === null) {
            return;
        }

        $this->insert(
            action: $action,
            message: $adminMessage,
            actorUserId: $impersonator->id,
            tenantId: $tenantId,
            resourceType: $resourceType,
            resourceId: $resourceId,
            oldValues: $oldValues,
            newValues: $newValues,
            impersonatorUserId: null,
            impersonatedUserId: $actor->id,
        );
    }

    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    private function insert(
        UserActivityAction $action,
        string $message,
        ?int $actorUserId,
        ?int $tenantId,
        ?string $resourceType,
        ?int $resourceId,
        ?array $oldValues,
        ?array $newValues,
        ?int $impersonatorUserId,
        ?int $impersonatedUserId,
    ): void {
        UserActivityEvent::query()->create([
            'actor_user_id' => $actorUserId,
            'tenant_id' => $tenantId,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'message' => $message,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'impersonator_user_id' => $impersonatorUserId,
            'impersonated_user_id' => $impersonatedUserId,
        ]);
    }

    private function resolveImpersonatorId(?User $actor, ?int $explicit): ?int
    {
        if ($explicit !== null) {
            return $explicit > 0 ? $explicit : null;
        }

        if ($actor === null) {
            return null;
        }

        $token = $actor->currentAccessToken();

        if (! is_object($token) || ! isset($token->name) || ! is_string($token->name)) {
            return null;
        }

        $name = $token->name;

        if (! str_starts_with($name, 'impersonate:')) {
            return null;
        }

        $id = (int) substr($name, strlen('impersonate:'));

        return $id > 0 ? $id : null;
    }
}
