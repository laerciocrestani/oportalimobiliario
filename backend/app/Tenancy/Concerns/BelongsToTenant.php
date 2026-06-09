<?php

namespace App\Tenancy\Concerns;

use App\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder): void {
            if (! TenantContext::has()) {
                return;
            }

            $builder->where(
                $builder->getModel()->getTable().'.tenant_id',
                TenantContext::id()
            );
        });

        static::creating(function (Model $model): void {
            if (! TenantContext::has()) {
                return;
            }

            if ($model->getAttribute('tenant_id') === null) {
                $model->setAttribute('tenant_id', TenantContext::id());
            }
        });
    }
}
