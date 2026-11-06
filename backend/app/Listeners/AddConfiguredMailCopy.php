<?php

namespace App\Listeners;

use Illuminate\Mail\Events\MessageSending;
use Symfony\Component\Mime\Address;

class AddConfiguredMailCopy
{
    public function handle(MessageSending $event): void
    {
        $address = $this->copyAddress();

        if ($address === null || $this->alreadyReceives($event, $address)) {
            return;
        }

        $event->message->addCc($address);
    }

    private function copyAddress(): ?string
    {
        $configured = trim((string) config('mail.cc'));

        if ($configured === '') {
            $configured = trim((string) config('mail.from.address'));
        }

        return filter_var($configured, FILTER_VALIDATE_EMAIL) ? $configured : null;
    }

    private function alreadyReceives(MessageSending $event, string $address): bool
    {
        $recipients = [
            ...$event->message->getTo(),
            ...$event->message->getCc(),
            ...$event->message->getBcc(),
        ];

        foreach ($recipients as $recipient) {
            if (! $recipient instanceof Address) {
                continue;
            }

            if (strcasecmp($recipient->getAddress(), $address) === 0) {
                return true;
            }
        }

        return false;
    }
}
