<?php

use App\Support\PhoneNumberNormalizer;

it('normalizes brazilian phone numbers to e164', function () {
    $normalizer = new PhoneNumberNormalizer;

    expect($normalizer->toE164('(11) 99999-9999'))->toBe('+5511999999999')
        ->and($normalizer->toE164('+5511988887777'))->toBe('+5511988887777')
        ->and($normalizer->toE164(''))->toBeNull();
});
