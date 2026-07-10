<?php

return [
    'pre_reservation_ttl_minutes' => (int) env('OPIM_PRE_RESERVATION_TTL_MINUTES', 10),
    'reservation_ttl_hours' => (int) env('OPIM_RESERVATION_TTL_HOURS', 48),

    'frontend_urls' => [
        'builder' => env('FRONTEND_BUILDER_URL', 'http://construtora.localhost:5173'),
        'broker' => env('FRONTEND_BROKER_URL', 'http://corretor.localhost:5173'),
    ],
];
