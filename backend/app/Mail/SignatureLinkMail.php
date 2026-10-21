<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SignatureLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public string $signUrl,
        public string $documentLabel = 'proposta',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->documentLabel === 'contrato'
                ? 'Link para assinar o contrato'
                : 'Link para assinar a proposta',
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.signature-link',
        );
    }
}
