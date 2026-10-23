<?php

namespace App\Services;

use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Support\ContractSystemVariables;
use Illuminate\Support\Number;

class ContractVariableResolver
{
    /**
     * @return list<string>
     */
    public function extractPlaceholders(string $markdown): array
    {
        preg_match_all('/\{\{\s*([a-z][a-z0-9_]*)\s*\??\s*\}\}/', $markdown, $matches);

        return array_values(array_unique($matches[1] ?? []));
    }

    /**
     * Placeholders written as {{slug?}} are optional. A slug used without ? stays required.
     *
     * @return list<string>
     */
    public function optionalPlaceholderSlugs(string $markdown): array
    {
        preg_match_all('/\{\{\s*([a-z][a-z0-9_]*)\s*(\?)?\s*\}\}/', $markdown, $matches, PREG_SET_ORDER);

        $required = [];
        $optional = [];

        foreach ($matches as $match) {
            $slug = $match[1];

            if (($match[2] ?? '') === '?') {
                $optional[$slug] = true;
            } else {
                $required[$slug] = true;
            }
        }

        return array_values(array_keys(array_diff_key($optional, $required)));
    }

    /**
     * @param  list<string>  $customSlugs
     * @return list<string>
     */
    public function unknownPlaceholders(string $markdown, array $customSlugs = []): array
    {
        $known = [
            ...ContractSystemVariables::slugs(),
            ...$customSlugs,
        ];

        return array_values(array_diff($this->extractPlaceholders($markdown), $known));
    }

    /**
     * @return array<string, string>
     */
    public function systemValues(Reservation $reservation, ?string $finalPriceBrl = null): array
    {
        $reservation->loadMissing(['unit.building', 'broker', 'client', 'proposals', 'garageUnits']);
        $proposal = $reservation->proposals->sortByDesc('version')->first();
        $unit = $reservation->unit;
        $price = $finalPriceBrl ?? $unit?->frozen_price_brl ?? $unit?->price;

        return [
            'nome_cliente' => $this->string($proposal?->client_name ?? $reservation->client?->name),
            'telefone_cliente' => $this->string($proposal?->client_phone ?? $reservation->client?->phone),
            'email_cliente' => $this->string($proposal?->client_email ?? $reservation->client?->email),
            'cpf_cliente' => $this->formatDocument($proposal?->client_cpf),
            'rg_cliente' => $this->string($proposal?->client_rg),
            'nacionalidade_cliente' => $this->string($proposal?->nationality),
            'profissao_cliente' => $this->string($proposal?->profession),
            'estado_civil' => $this->string($proposal?->marital_status),
            'endereco_cliente' => $this->string($proposal?->address),
            'cidade_cliente' => $this->string($proposal?->city),
            'uf_cliente' => $this->string($proposal?->state),
            'cep_cliente' => $this->string($proposal?->zip),
            'nome_conjuge' => $this->string($proposal?->spouse_name),
            'telefone_conjuge' => $this->string($proposal?->spouse_phone),
            'email_conjuge' => $this->string($proposal?->spouse_email),
            'cpf_conjuge' => $this->formatDocument($proposal?->spouse_cpf),
            'rg_conjuge' => $this->string($proposal?->spouse_rg),
            'nacionalidade_conjuge' => $this->string($proposal?->spouse_nationality),
            'codigo_unidade' => $this->string($unit?->code),
            'box' => $reservation->garageUnits
                ->pluck('code')
                ->map(fn (mixed $code): string => trim((string) $code))
                ->filter(fn (string $code): bool => $code !== '')
                ->implode(', '),
            'andar_unidade' => $unit?->floor !== null ? (string) $unit->floor : '',
            'area_unidade' => $this->formatArea($unit?->area_m2),
            'nome_empreendimento' => $this->string($unit?->building?->name),
            'correcao_modo' => $unit?->building?->price_mode?->value ?? 'incc',
            'preco_final' => $this->formatMoney($price),
            'valor_terreno' => $this->formatMoney($proposal?->land_value),
            'condicoes_pagamento' => $this->string($proposal?->payment_terms),
            'nome_corretor' => $this->string($reservation->broker?->name),
            'data_emissao' => now('America/Sao_Paulo')->format('d/m/Y'),
        ];
    }

    /**
     * @param  list<array{slug?: mixed, label?: mixed}|mixed>  $customVariables
     * @return list<string>
     */
    public function requiredPlaceholders(string $markdown, array $customVariables): array
    {
        $customSlugs = array_values(array_filter(array_map(
            fn (mixed $variable): string => is_array($variable) ? (string) ($variable['slug'] ?? '') : '',
            $customVariables,
        )));

        $used = $this->extractPlaceholders($markdown);
        $unknown = $this->unknownPlaceholders($markdown, $customSlugs);
        $optional = array_flip($this->optionalPlaceholderSlugs($markdown));

        return array_values(array_unique(array_filter(
            [
                ...array_intersect($customSlugs, $used),
                ...$unknown,
            ],
            fn (string $slug): bool => ! isset($optional[$slug]),
        )));
    }

    /**
     * @return list<string>
     */
    public function requiredCustomSlugs(ContractTemplate $template): array
    {
        return $this->requiredPlaceholders($template->body_markdown, $template->custom_variables ?? []);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, string>
     */
    public function mergeValues(Reservation $reservation, ContractTemplate $template, array $overrides, string $finalPriceBrl): array
    {
        return $this->mergeOverrides($reservation, $overrides, $finalPriceBrl);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, string>
     */
    public function mergeOverrides(Reservation $reservation, array $overrides, string $finalPriceBrl): array
    {
        $values = $this->systemValues($reservation, $finalPriceBrl);

        foreach ($overrides as $slug => $value) {
            if (! is_string($slug)) {
                continue;
            }

            $values[$slug] = $this->string($value);
        }

        $values['preco_final'] = $this->formatMoney($finalPriceBrl);

        return $values;
    }

    private function string(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        return trim((string) $value);
    }

    private function formatDocument(mixed $value): string
    {
        $digits = preg_replace('/\D+/', '', $this->string($value)) ?? '';

        if (strlen($digits) === 11) {
            return substr($digits, 0, 3).'.'.substr($digits, 3, 3).'.'.substr($digits, 6, 3).'-'.substr($digits, 9, 2);
        }

        if (strlen($digits) === 14) {
            return substr($digits, 0, 2).'.'.substr($digits, 2, 3).'.'.substr($digits, 5, 3).'/'.substr($digits, 8, 4).'-'.substr($digits, 12, 2);
        }

        return $this->string($value);
    }

    private function formatMoney(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return Number::format((float) $value, precision: 2, locale: 'pt_BR');
    }

    private function formatArea(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return Number::format((float) $value, precision: 2, locale: 'pt_BR');
    }
}
