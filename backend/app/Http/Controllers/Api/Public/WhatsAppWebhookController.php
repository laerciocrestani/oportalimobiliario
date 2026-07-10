<?php

namespace App\Http\Controllers\Api\Public;

use App\Enums\BrokerInviteDeliveryStatus;
use App\Http\Controllers\Controller;
use App\Models\BrokerInvite;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * @see REQ-WA-006
 */
class WhatsAppWebhookController extends Controller
{
    public function verify(Request $request): Response|SymfonyResponse
    {
        $verifyToken = (string) config('services.whatsapp.verify_token');

        if (
            $request->query('hub_mode') === 'subscribe'
            && $request->query('hub_verify_token') === $verifyToken
            && is_string($request->query('hub_challenge'))
        ) {
            return response($request->query('hub_challenge'), 200);
        }

        return response('Forbidden', 403);
    }

    public function handle(Request $request): Response
    {
        $payload = $request->all();

        foreach ($payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value = $change['value'] ?? [];

                foreach ($value['statuses'] ?? [] as $status) {
                    $this->updateDeliveryStatus($status);
                }
            }
        }

        return response('OK', 200);
    }

    /**
     * @param  array<string, mixed>  $status
     */
    private function updateDeliveryStatus(array $status): void
    {
        $messageId = $status['id'] ?? null;
        $deliveryStatus = $status['status'] ?? null;

        if (! is_string($messageId) || ! is_string($deliveryStatus)) {
            return;
        }

        $invite = BrokerInvite::query()
            ->withoutGlobalScope('tenant')
            ->where('whatsapp_message_id', $messageId)
            ->first();

        if ($invite === null) {
            return;
        }

        $mappedStatus = match ($deliveryStatus) {
            'sent' => BrokerInviteDeliveryStatus::Sent,
            'delivered', 'read' => BrokerInviteDeliveryStatus::Delivered,
            'failed' => BrokerInviteDeliveryStatus::Failed,
            default => null,
        };

        if ($mappedStatus === null) {
            return;
        }

        $invite->update([
            'delivery_status' => $mappedStatus->value,
            'delivery_error' => $deliveryStatus === 'failed'
                ? json_encode($status['errors'] ?? [], JSON_UNESCAPED_UNICODE)
                : null,
        ]);
    }
}
