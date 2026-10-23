<?php

namespace App\Support;

use App\Enums\DepositKind;
use App\Enums\PartyKind;
use Closure;
use Illuminate\Validation\Rule;

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
            'party_kind' => ['required', Rule::enum(PartyKind::class)],
            'payment_terms' => ['required', 'string', 'max:20000'],
            'commercial_terms' => ['sometimes', 'nullable', 'array'],
            'commercial_terms.description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'commercial_terms.reinforcements' => ['sometimes', 'array', 'max:30'],
            'commercial_terms.reinforcements.*.amount' => ['nullable', 'string', 'max:40'],
            'commercial_terms.reinforcements.*.due_on' => ['nullable', 'string', 'max:20'],
            'commercial_terms.dations' => ['sometimes', 'array', 'max:30'],
            'commercial_terms.dations.*' => ['nullable', 'string', 'max:500'],
            'deposit_kind' => ['required', Rule::enum(DepositKind::class)],
            'files' => ['sometimes', 'array', 'max:10'],
            'files.*' => ['file'],
            'client_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'client_cpf' => ['required', 'string', 'max:18', self::document()],
            'client_rg' => ['required_if:party_kind,individual', 'nullable', 'string', 'max:20'],
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'size:2'],
            'zip' => ['required', 'string', 'max:9'],
            'marital_status' => ['required_if:party_kind,individual', 'nullable', 'string', 'max:50'],
            'nationality' => ['required_if:party_kind,individual', 'nullable', 'string', 'max:50'],
            'profession' => ['required_if:party_kind,individual', 'nullable', 'string', 'max:120'],
            'spouse_name' => ['required_if:marital_status,Casado(a)', 'nullable', 'string', 'max:255'],
            'spouse_cpf' => ['required_if:marital_status,Casado(a)', 'nullable', 'string', 'max:14'],
            'land_value' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ];
    }

    private static function document(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $digits = preg_replace('/\D+/', '', (string) $value) ?? '';
            $kind = request()->input('party_kind');
            $expected = $kind === PartyKind::Company->value ? 14 : 11;

            if (strlen($digits) !== $expected) {
                $fail($kind === PartyKind::Company->value
                    ? 'Informe o CNPJ com 14 dígitos.'
                    : 'Informe o CPF com 11 dígitos.');
            }
        };
    }
}
