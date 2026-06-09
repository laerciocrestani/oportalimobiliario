<?php

/**
 * @see REQ-TEN-006
 */
use App\Tenancy\Concerns\TenantAwareJob;

it('stores tenant id on job payload', function () {
    $job = new class(7) implements \Illuminate\Contracts\Queue\ShouldQueue
    {
        use TenantAwareJob;

        use \Illuminate\Foundation\Queue\Queueable;
    };

    expect($job->tenantId)->toBe(7);
});
