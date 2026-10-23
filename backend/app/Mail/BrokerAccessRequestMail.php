<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BrokerAccessRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $brokerName,
        public string $phone,
        public ?string $email,
        public string $buildingName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pedido de acesso para comercializar '.$this->buildingName,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.broker-access-request',
        );
    }
}
