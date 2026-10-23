<?php

namespace App\Services\ZapSign;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Conta única da plataforma. O tenant vai no external_id do documento.
 *
 * @see REQ-RDP-006
 */
class ZapSignClient
{
    /**
     * @param  list<array{role: string, name: string, phone: string, email: string, key?: string}>  $signers
     * @return array{token: string, signers: array<string, array{token: string, sign_url: ?string}>}
     */
    public function createDocument(string $name, string $pdf, string $externalId, array $signers): array
    {
        $token = (string) config('services.zapsign.token');

        if ($token === '') {
            throw new RuntimeException('ZapSign não está configurado.');
        }

        $response = Http::baseUrl(rtrim((string) config('services.zapsign.base_url'), '/'))
            ->withToken($token)
            ->acceptJson()
            ->post('/api/v1/docs/', [
                'name' => $name,
                'base64_pdf' => base64_encode($pdf),
                'external_id' => $externalId,
                'signers' => array_map(function (array $signer): array {
                    $key = $signer['key'] ?? $signer['role'];

                    return array_filter([
                        'name' => $signer['name'],
                        'email' => $signer['email'] !== '' ? $signer['email'] : null,
                        'phone_country' => '55',
                        'phone_number' => $signer['phone'],
                        'external_id' => $key,
                        'send_automatic_email' => false,
                        'send_automatic_whatsapp' => false,
                    ], fn (mixed $value): bool => $value !== null);
                }, $signers),
            ]);

        if ($response->failed()) {
            throw new RuntimeException('ZapSign recusou o documento (HTTP '.$response->status().').');
        }

        $documentToken = $response->json('token');

        if (! is_string($documentToken) || $documentToken === '') {
            throw new RuntimeException('ZapSign não devolveu o documento.');
        }

        $byRole = [];

        foreach ($response->json('signers') ?? [] as $row) {
            if (! is_array($row)) {
                continue;
            }

            $role = (string) ($row['external_id'] ?? '');
            $signerToken = (string) ($row['token'] ?? '');

            if ($role === '' || $signerToken === '') {
                continue;
            }

            $signUrl = $row['sign_url'] ?? null;
            $byRole[$role] = [
                'token' => $signerToken,
                'sign_url' => is_string($signUrl) && $signUrl !== '' ? $signUrl : null,
            ];
        }

        foreach ($signers as $signer) {
            $key = $signer['key'] ?? $signer['role'];

            if (! isset($byRole[$key])) {
                throw new RuntimeException('ZapSign não devolveu o signatário '.$key.'.');
            }
        }

        return [
            'token' => $documentToken,
            'signers' => $byRole,
        ];
    }
}
