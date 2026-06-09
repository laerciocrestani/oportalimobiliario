<?php

/**
 * @see REQ-INFRA-003
 */
it('returns api health status', function () {
    $response = $this->getJson('/api/health');

    $response
        ->assertOk()
        ->assertJson([
            'status' => 'ok',
            'service' => 'oportalimobiliario-api',
        ]);
});
