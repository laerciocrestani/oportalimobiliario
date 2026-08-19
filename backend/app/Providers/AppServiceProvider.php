<?php

namespace App\Providers;

use App\Models\User;
use App\Policies\TeamMemberPolicy;
use App\Services\UnitPriceCalculator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(UnitPriceCalculator::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(User::class, TeamMemberPolicy::class);
    }
}
