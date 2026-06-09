<?php

/**
 * @see REQ-SUB-007
 */
it('allows preflight from construtora portal origin', function () {
    config([
        'cors.allowed_origins' => ['http://construtora.localhost:5173'],
    ]);

    $response = $this->call('OPTIONS', '/api/health', [], [], [], [
        'HTTP_ORIGIN' => 'http://construtora.localhost:5173',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ]);

    $response
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', 'http://construtora.localhost:5173');
});

it('does not echo unknown origin in preflight response', function () {
    config([
        'cors.allowed_origins' => ['http://construtora.localhost:5173'],
    ]);

    $response = $this->call('OPTIONS', '/api/health', [], [], [], [
        'HTTP_ORIGIN' => 'http://evil.example.com',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ]);

    expect($response->headers->get('Access-Control-Allow-Origin'))
        ->not->toBe('http://evil.example.com');
});
