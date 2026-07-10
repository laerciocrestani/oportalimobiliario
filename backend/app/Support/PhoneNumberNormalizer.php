<?php

namespace App\Support;

class PhoneNumberNormalizer
{
    public function toE164(string $phone, string $defaultCountryCode = '55'): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, $defaultCountryCode) && strlen($digits) >= 12) {
            return '+'.$digits;
        }

        if (strlen($digits) === 10 || strlen($digits) === 11) {
            return '+'.$defaultCountryCode.$digits;
        }

        return '+'.$digits;
    }
}
