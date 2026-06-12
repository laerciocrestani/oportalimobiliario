<?php

return [
    'reservation_ttl_hours' => (int) env('OPIM_RESERVATION_TTL_HOURS', 48),

    'frontend_urls' => [
        'broker' => env('FRONTEND_BROKER_URL', 'http://corretor.localhost:5173'),
    ],
];
