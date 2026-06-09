<?php

namespace App\Tenancy\Concerns;

trait TenantAwareJob
{
    public int $tenantId;

    public function __construct(int $tenantId)
    {
        $this->tenantId = $tenantId;
    }
}
