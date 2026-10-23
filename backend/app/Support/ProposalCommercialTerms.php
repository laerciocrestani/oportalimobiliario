<?php

namespace App\Support;

use DateTimeImmutable;
use Illuminate\Validation\ValidationException;

final class ProposalCommercialTerms
{
    /**
     * @param  array<string, mixed>|null  $input
     * @return array{description?: string, reinforcements: list<array{amount: string|null, due_on: string|null}>, dations: list<string>}|null
     */
    public static function normalize(?array $input): ?array
    {
        if ($input === null) {
            return null;
        }

        $reinforcements = [];
        $errors = [];

        foreach (array_values($input['reinforcements'] ?? []) as $index => $row) {
            if (! is_array($row)) {
                continue;
            }

            $amountRaw = trim((string) ($row['amount'] ?? ''));
            $dueRaw = trim((string) ($row['due_on'] ?? ''));

            if ($amountRaw === '' && $dueRaw === '') {
                continue;
            }

            $amount = null;
            $dueOn = null;

            if ($amountRaw !== '') {
                $parsedAmount = self::money($amountRaw);

                if ($parsedAmount === null) {
                    $errors["commercial_terms.reinforcements.{$index}.amount"] = 'Informe o valor do reforço.';
                } else {
                    $amount = $parsedAmount;
                }
            }

            if ($dueRaw !== '') {
                $parsedDate = self::date($dueRaw);

                if ($parsedDate === null) {
                    $errors["commercial_terms.reinforcements.{$index}.due_on"] = 'Informe o vencimento como dd/mm/aaaa.';
                } else {
                    $dueOn = $parsedDate;
                }
            }

            if (! isset($errors["commercial_terms.reinforcements.{$index}.amount"])
                && ! isset($errors["commercial_terms.reinforcements.{$index}.due_on"])) {
                $reinforcements[] = [
                    'amount' => $amount,
                    'due_on' => $dueOn,
                ];
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $dations = [];

        foreach (array_values($input['dations'] ?? []) as $line) {
            $text = trim(strip_tags((string) $line));

            if ($text !== '') {
                $dations[] = $text;
            }
        }

        $description = trim(strip_tags((string) ($input['description'] ?? '')));
        $description = trim(preg_replace('/[ \t]+/u', ' ', $description) ?? $description);

        if ($reinforcements === [] && $dations === [] && $description === '') {
            return null;
        }

        $terms = [
            'reinforcements' => $reinforcements,
            'dations' => $dations,
        ];

        if ($description !== '') {
            $terms['description'] = $description;
        }

        return $terms;
    }

    private static function money(string $value): ?string
    {
        $cleaned = preg_replace('/[^\d,.]/', '', $value) ?? '';

        if (str_contains($cleaned, ',')) {
            $normalized = str_replace(',', '.', str_replace('.', '', $cleaned));
        } elseif (preg_match('/^\d{1,3}(\.\d{3})+$/', $cleaned) === 1) {
            $normalized = str_replace('.', '', $cleaned);
        } else {
            $normalized = $cleaned;
        }

        if ($normalized === '' || ! is_numeric($normalized)) {
            return null;
        }

        return number_format((float) $normalized, 2, '.', '');
    }

    private static function date(string $value): ?string
    {
        foreach (['!d/m/Y', '!Y-m-d'] as $format) {
            $parsed = DateTimeImmutable::createFromFormat($format, $value);

            if ($parsed instanceof DateTimeImmutable && $parsed->format(ltrim($format, '!')) === $value) {
                return $parsed->format('Y-m-d');
            }
        }

        return null;
    }
}
