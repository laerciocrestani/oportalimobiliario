<?php

namespace App\Support;

use Illuminate\Validation\Rule;

class ReservationContractDataRules
{
    public const MARRIED = 'Casado(a)';

    /**
     * @var list<string>
     */
    public const MARITAL_STATUSES = [
        'Solteiro(a)',
        'Casado(a)',
        'Divorciado(a)',
        'Viúvo(a)',
        'Separado(a)',
    ];

    /**
     * @return array<string, mixed>
     */
    public static function submit(): array
    {
        $spouseRequired = Rule::requiredIf(fn () => request('marital_status') === self::MARRIED);

        return [
            'client_name' => ['nullable', 'string', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:20'],
            'client_email' => ['nullable', 'string', 'email', 'max:255'],
            'client_cpf' => ['required', 'string', 'size:11', Cpf::rule()],
            'client_rg' => ['required', 'string', 'max:20'],
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'size:2'],
            'zip' => ['required', 'string', 'max:9'],
            'marital_status' => ['required', 'string', Rule::in(self::MARITAL_STATUSES)],
            'nationality' => ['required', 'string', 'max:50'],
            'spouse_name' => [$spouseRequired, 'nullable', 'string', 'max:255'],
            'spouse_phone' => ['nullable', 'string', 'max:20'],
            'spouse_email' => ['nullable', 'string', 'email', 'max:255'],
            'spouse_cpf' => [$spouseRequired, 'nullable', 'string', 'size:11', Cpf::rule()],
            'spouse_rg' => [$spouseRequired, 'nullable', 'string', 'max:20'],
            'spouse_nationality' => [$spouseRequired, 'nullable', 'string', 'max:50'],
            'files' => ['required', 'array', 'min:1'],
            'files.*' => ['required', 'file'],
        ];
    }
}
