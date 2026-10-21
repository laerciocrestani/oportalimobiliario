<?php

namespace App\Services;

use App\Exceptions\WhatsAppApiException;
use App\Models\BrokerInvite;
use Illuminate\Support\Facades\Http;

class WhatsAppCloudApiService
{
    /**
     * @param  list<string>  $bodyParameters
     * @param  list<array<string, mixed>>  $extraComponents
     */
    public function sendTemplateMessage(
        string $to,
        string $templateName,
        string $languageCode,
        array $bodyParameters,
        array $extraComponents = [],
    ): string {
        $accessToken = (string) config('services.whatsapp.access_token');
        $phoneNumberId = (string) config('services.whatsapp.phone_number_id');

        if ($accessToken === '' || $phoneNumberId === '') {
            throw new WhatsAppApiException('WhatsApp API não configurada.');
        }

        $components = [
            [
                'type' => 'body',
                'parameters' => array_map(
                    fn (string $text): array => ['type' => 'text', 'text' => $text],
                    $bodyParameters,
                ),
            ],
            ...$extraComponents,
        ];

        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->post($this->messagesUrl(), [
                'messaging_product' => 'whatsapp',
                'to' => ltrim($to, '+'),
                'type' => 'template',
                'template' => [
                    'name' => $templateName,
                    'language' => ['code' => $languageCode],
                    'components' => $components,
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

    public function sendBrokerInvite(BrokerInvite $invite): string
    {
        $invite->loadMissing('tenant');

        $templateName = (string) config('services.whatsapp.templates.broker_invite');
        $languageCode = (string) config('services.whatsapp.template_language', 'pt_BR');

        if ($invite->phone === null || $invite->phone === '') {
            throw new WhatsAppApiException('Telefone do convite não informado.');
        }

        if ($invite->token === '') {
            throw new WhatsAppApiException('Token do convite não informado.');
        }

        return $this->sendTemplateMessage(
            $this->internationalPhone($invite->phone),
            $templateName,
            $languageCode,
            [
                $invite->name,
                $invite->tenant->name,
            ],
            [
                [
                    'type' => 'button',
                    'sub_type' => 'url',
                    'index' => '0',
                    'parameters' => [
                        ['type' => 'text', 'text' => $invite->token],
                    ],
                ],
            ],
        );
    }

    public function sendSignatureLink(string $phone, string $recipientName, string $signUrl): string
    {
        $templateName = (string) config('services.whatsapp.templates.signature_link');
        $languageCode = (string) config('services.whatsapp.template_language', 'pt_BR');

        if ($templateName === '') {
            throw new WhatsAppApiException('Modelo de WhatsApp da assinatura não configurado.');
        }

        return $this->sendTemplateMessage(
            $this->internationalPhone($phone),
            $templateName,
            $languageCode,
            [$recipientName, $signUrl],
        );
    }

    private function internationalPhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            throw new WhatsAppApiException('Telefone do signatário não informado.');
        }

        if (! str_starts_with($digits, '55') && strlen($digits) <= 11) {
            $digits = '55'.$digits;
        }

        return $digits;
    }

    private function messagesUrl(): string
    {
        $version = (string) config('services.whatsapp.api_version', 'v21.0');
        $phoneNumberId = (string) config('services.whatsapp.phone_number_id');

        return "https://graph.facebook.com/{$version}/{$phoneNumberId}/messages";
    }
}
