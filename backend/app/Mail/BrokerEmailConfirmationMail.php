<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BrokerEmailConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public string $confirmUrl,
        public string $expiresAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confirme seu acesso ao portal do corretor',
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'mail.broker-email-confirmation',
            text: 'mail.broker-email-confirmation-text',
        );
    }
}
