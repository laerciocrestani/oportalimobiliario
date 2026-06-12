<?php

namespace App\Mail;

use App\Models\BrokerInvite;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BrokerInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public BrokerInvite $invite,
        public string $inviteUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Convite para corretor — '.$this->invite->tenant->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.broker-invite',
        );
    }
}
