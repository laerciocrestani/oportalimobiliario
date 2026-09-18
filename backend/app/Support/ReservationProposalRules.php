<?php

namespace App\Support;

class ReservationProposalRules
{
    /**
     * @return array<string, mixed>
     */
    public static function submit(): array
    {
        return [
            'client_name' => ['required', 'string', 'max:255'],
            'client_phone' => ['required', 'string', 'max:20'],
            'payment_terms' => ['required', 'string', 'max:2000'],
            'files' => ['required', 'array', 'min:1', 'max:10'],
            'files.*' => ['required', 'file'],
            'client_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'client_cpf' => ['sometimes', 'nullable', 'string', 'max:11'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'state' => ['sometimes', 'nullable', 'string', 'max:2'],
            'zip' => ['sometimes', 'nullable', 'string', 'max:9'],
            'marital_status' => ['sometimes', 'nullable', 'string', 'max:50'],
            'nationality' => ['sometimes', 'nullable', 'string', 'max:50'],
            'land_value' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ];
    }
}
