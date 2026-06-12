<?php

it('uses isolated sqlite database for tests', function () {
    $app = app();

    expect($app->environment())->toBe('testing')
        ->and($app->environmentFile())->toBe('.env.testing')
        ->and(config('database.default'))->toBe('sqlite')
        ->and(config('database.connections.sqlite.database'))->toBe(':memory:');
});
