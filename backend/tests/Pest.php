<?php

/*
| Força ambiente de testes antes do Laravel bootar.
| Sem isso, .env local (pgsql) era usado e RefreshDatabase apagava o banco de dev.
*/
$_SERVER['APP_ENV'] = 'testing';
$_ENV['APP_ENV'] = 'testing';
putenv('APP_ENV=testing');

$_SERVER['DB_CONNECTION'] = 'sqlite';
$_ENV['DB_CONNECTION'] = 'sqlite';
putenv('DB_CONNECTION=sqlite');

$_SERVER['DB_DATABASE'] = ':memory:';
$_ENV['DB_DATABASE'] = ':memory:';
putenv('DB_DATABASE=:memory:');

$_SERVER['DB_URL'] = '';
$_ENV['DB_URL'] = '';
putenv('DB_URL');

use App\Support\BuilderPermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature', 'Unit');

uses(RefreshDatabase::class)->in('Feature', 'Unit');

beforeEach(function () {
    BuilderPermissions::seed();
})->in('Feature');
