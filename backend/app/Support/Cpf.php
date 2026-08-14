<?php

namespace App\Support;

use Closure;

class Cpf
{
    public static function isValid(string $value): bool
    {
        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if (strlen($digits) !== 11) {
            return false;
        }

        if (preg_match('/^(\d)\1{10}$/', $digits) === 1) {
            return false;
        }

        return self::checkDigit($digits, 9) && self::checkDigit($digits, 10);
    }

    /**
     * @return Closure(string, mixed, Closure): void
     */
    public static function rule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! self::isValid((string) $value)) {
                $fail('O CPF informado é inválido.');
            }
        };
    }

    private static function checkDigit(string $digits, int $length): bool
    {
        $sum = 0;

        for ($i = 0; $i < $length; $i++) {
            $sum += (int) $digits[$i] * (($length + 1) - $i);
        }

        $digit = ((10 * $sum) % 11) % 10;

        return (int) $digits[$length] === $digit;
    }
}
