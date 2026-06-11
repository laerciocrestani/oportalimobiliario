<?php

use App\Support\BuilderPermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature', 'Unit');

uses(RefreshDatabase::class)->in('Feature', 'Unit');

beforeEach(function () {
    BuilderPermissions::seed();
})->in('Feature');
