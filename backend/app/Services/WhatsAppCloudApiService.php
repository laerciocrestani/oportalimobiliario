<?php

namespace App\Services;

use App\Exceptions\WhatsAppApiException;
use App\Models\BrokerInvite;
use Illuminate\Support\Facades\Http;

class WhatsAppCloudApiService
{
    /**
     * @param  list<string>  $bodyParameters
     */
    public function sendTemplateMessage(string $to, string $templateName, string $languageCode, array $bodyParameters): string
    {
        $accessToken = (string) config('services.whatsapp.access_token');
        $phoneNumberId = (string) config('services.whatsapp.phone_number_id');

        if ($accessToken === '' || $phoneNumberId === '') {
            throw new WhatsAppApiException('WhatsApp API não configurada.');
        }

        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->post($this->messagesUrl(), [
                'messaging_product' => 'whatsapp',
                'to' => ltrim($to, '+'),
                'type' => 'template',
                'template' => [
                    'name' => $templateName,
                    'language' => ['code' => $languageCode],
                    'components' => [
                        [
                            'type' => 'body',
                            'parameters' => array_map(
                                fn (string $text): array => ['type' => 'text', 'text' => $text],
                                $bodyParameters,
                            ),
                        ],
                    ],
                ],
            ]);

        if ($response->failed()) {
            $message = $response->json('error.message') ?? $response->body();

            throw new WhatsAppApiException((string) $message);
        }

        $messageId = $response->json('messages.0.id');

        if (! is_string($messageId) || $messageId === '') {
            throw new WhatsAppApiException('Resposta inválida da API WhatsApp.');
        }

        return $messageId;
    }

    public function sendBrokerInvite(BrokerInvite $invite, string $inviteUrl): string
    {
        $invite->loadMissing('tenant');

        $templateName = (string) config('services.whatsapp.templates.broker_invite');
        $languageCode = (string) config('services.whatsapp.template_language', 'pt_BR');

        if ($invite->phone === null || $invite->phone === '') {
            throw new WhatsAppApiException('Telefone do convite não informado.');
        }

        return $this->sendTemplateMessage(
            $invite->phone,
            $templateName,
            $languageCode,
            [
                $invite->name,
                $invite->tenant->name,
                $inviteUrl,
            ],
        );
    }

    private function messagesUrl(): string
    {
        $version = (string) config('services.whatsapp.api_version', 'v21.0');
        $phoneNumberId = (string) config('services.whatsapp.phone_number_id');

        return "https://graph.facebook.com/{$version}/{$phoneNumberId}/messages";
    }
}
