<?php

namespace App\Tenancy;

class TenantContext
{
    private static ?int $tenantId = null;

    public static function set(?int $tenantId): void
    {
        self::$tenantId = $tenantId;
    }

    public static function id(): ?int
    {
        return self::$tenantId;
    }

    public static function has(): bool
    {
        return self::$tenantId !== null;
    }

    public static function forget(): void
    {
        self::$tenantId = null;
    }
}
