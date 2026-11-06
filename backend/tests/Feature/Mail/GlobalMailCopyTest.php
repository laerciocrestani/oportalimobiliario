<?php

use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Email;

it('copies every message to the configured address', function () {
    config([
        'mail.cc' => 'financeiro@pidia.com.br',
        'mail.from.address' => 'financeiro@pidia.com.br',
    ]);

    Mail::raw('Corpo', function ($message) {
        $message->to('cliente@example.com')->subject('Assunto');
    });

    expect(sentEmail()->getCc()[0]->getAddress())->toBe('financeiro@pidia.com.br');
});

it('uses the global from address when the copy is empty', function () {
    config([
        'mail.cc' => '',
        'mail.from.address' => 'financeiro@pidia.com.br',
    ]);

    Mail::raw('Corpo', function ($message) {
        $message->to('cliente@example.com')->subject('Assunto');
    });

    expect(sentEmail()->getCc()[0]->getAddress())->toBe('financeiro@pidia.com.br');
});

it('does not copy the message to an address that already receives it', function () {
    config([
        'mail.cc' => 'financeiro@pidia.com.br',
        'mail.from.address' => 'financeiro@pidia.com.br',
    ]);

    Mail::raw('Corpo', function ($message) {
        $message->to('financeiro@pidia.com.br')->subject('Assunto');
    });

    expect(sentEmail()->getCc())->toBe([]);
});

function sentEmail(): Email
{
    $message = Mail::mailer('array')->getSymfonyTransport()->messages()->sole()->getOriginalMessage();

    expect($message)->toBeInstanceOf(Email::class);

    return $message;
}
