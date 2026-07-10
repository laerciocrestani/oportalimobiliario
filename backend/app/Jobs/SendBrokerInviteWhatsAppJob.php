<?php

namespace App\Jobs;

use App\Enums\BrokerInviteDeliveryStatus;
use App\Models\BrokerInvite;
use App\Services\WhatsAppCloudApiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class SendBrokerInviteWhatsAppJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $inviteId) {}

    public function handle(WhatsAppCloudApiService $whatsapp): void
    {
        $invite = BrokerInvite::query()
            ->withoutGlobalScope('tenant')
            ->find($this->inviteId);

        if ($invite === null) {
            return;
        }

        try {
            $messageId = $whatsapp->sendBrokerInvite($invite);

            $invite->update([
                'whatsapp_message_id' => $messageId,
                'delivery_status' => BrokerInviteDeliveryStatus::Sent->value,
                'delivery_error' => null,
            ]);
        } catch (Throwable $exception) {
            $invite->update([
                'delivery_status' => BrokerInviteDeliveryStatus::Failed->value,
                'delivery_error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }
}
