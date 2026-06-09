<?php

/**
 * @see REQ-TEN-001
 */
use App\Tenancy\TenantContext;

afterEach(function () {
    TenantContext::forget();
});

it('sets and reads tenant id', function () {
    TenantContext::set(42);

    expect(TenantContext::id())->toBe(42)
        ->and(TenantContext::has())->toBeTrue();
});

it('forgets tenant context', function () {
    TenantContext::set(1);
    TenantContext::forget();

    expect(TenantContext::has())->toBeFalse()
        ->and(TenantContext::id())->toBeNull();
});
