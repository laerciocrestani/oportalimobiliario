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
            'client_email' => ['required', 'string', 'email', 'max:255'],
            'client_phone' => ['required', 'string', 'max:20'],
            'client_cpf' => ['required', 'string', 'size:11'],
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'size:2'],
            'zip' => ['required', 'string', 'max:9'],
            'marital_status' => ['required', 'string', 'max:50'],
            'nationality' => ['required', 'string', 'max:50'],
            'land_value' => ['required', 'numeric', 'min:0'],
            'payment_terms' => ['required', 'string', 'max:2000'],
        ];
    }
}
