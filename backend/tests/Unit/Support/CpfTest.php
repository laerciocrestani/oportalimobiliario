<?php

use App\Support\Cpf;

it('accepts valid cpfs including formatted values', function () {
    expect(Cpf::isValid('52998224725'))->toBeTrue()
        ->and(Cpf::isValid('529.982.247-25'))->toBeTrue()
        ->and(Cpf::isValid('11144477735'))->toBeTrue();
});

it('rejects incomplete repeated and checksum-invalid cpfs', function () {
    expect(Cpf::isValid('12345678901'))->toBeFalse()
        ->and(Cpf::isValid('00000000000'))->toBeFalse()
        ->and(Cpf::isValid('111.111.111-11'))->toBeFalse()
        ->and(Cpf::isValid('5299822472'))->toBeFalse()
        ->and(Cpf::isValid(''))->toBeFalse();
});
