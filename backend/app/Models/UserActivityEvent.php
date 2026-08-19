<?php

namespace App\Models;

use App\Enums\UserActivityAction;
use DateTimeInterface;
use Database\Factories\UserActivityEventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * @see REQ-LOG-001
 * @see REQ-LOG-012
 */
#[Fillable([
    'actor_user_id',
    'tenant_id',
    'action',
    'resource_type',
    'resource_id',
    'message',
    'old_values',
    'new_values',
    'impersonator_user_id',
    'impersonated_user_id',
    'created_at',
])]
class UserActivityEvent extends Model
{
    /** @use HasFactory<UserActivityEventFactory> */
    use HasFactory;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'action' => UserActivityAction::class,
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (UserActivityEvent $event): void {
            $event->created_at ??= now();
        });

        static::updating(function (): never {
            throw new LogicException('User activity events are append-only.');
        });

        static::deleting(function (): never {
            throw new LogicException('User activity events are append-only.');
        });
    }

    /**
     * Retention exception to append-only: delete events older than the cutoff.
     */
    public static function purgeOlderThan(DateTimeInterface $cutoff): int
    {
        return static::query()
            ->where('created_at', '<', $cutoff)
            ->toBase()
            ->delete();
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function impersonator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'impersonator_user_id');
    }

    public function impersonated(): BelongsTo
    {
        return $this->belongsTo(User::class, 'impersonated_user_id');
    }
}
