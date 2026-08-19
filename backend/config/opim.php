<?php

return [
    'pre_reservation_ttl_minutes' => (int) env('OPIM_PRE_RESERVATION_TTL_MINUTES', 10),
    'reservation_ttl_hours' => (int) env('OPIM_RESERVATION_TTL_HOURS', 48),
    'deposit_window_hours' => (int) env('OPIM_DEPOSIT_WINDOW_HOURS', env('OPIM_RESERVATION_TTL_HOURS', 48)),

    'frontend_urls' => [
        'builder' => env('FRONTEND_BUILDER_URL', 'http://construtora.localhost:5173'),
        'broker' => env('FRONTEND_BROKER_URL', 'http://corretor.localhost:5173'),
    ],

    'llm' => [
        'provider' => env('OPIM_LLM_PROVIDER', 'gemini'),
        'timeout' => (int) env('OPIM_LLM_TIMEOUT', 8),
        'gemini_api_key' => env('GEMINI_API_KEY'),
        'gemini_model' => env('OPIM_GEMINI_MODEL', 'gemini-2.0-flash'),
        'openai_api_key' => env('OPENAI_API_KEY'),
        'openai_model' => env('OPIM_OPENAI_MODEL', 'gpt-4o-mini'),
    ],
];
