<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ViaCepClient
{
    /**
     * @return array{zip: string, street: string, neighborhood: string, city: string, state: string, complement: string}|null
     */
    public function lookup(string $cep): ?array
    {
        try {
            $response = Http::timeout(3)
                ->connectTimeout(2)
                ->get("https://viacep.com.br/ws/{$cep}/json/");
        } catch (ConnectionException $exception) {
            throw new RuntimeException('ViaCEP unavailable.', 0, $exception);
        }

        if (! $response->successful()) {
            throw new RuntimeException('ViaCEP unavailable.');
        }

        $payload = $response->json();

        if (! is_array($payload) || ($payload['erro'] ?? false)) {
            return null;
        }

        return [
            'zip' => $cep,
            'street' => (string) ($payload['logradouro'] ?? ''),
            'neighborhood' => (string) ($payload['bairro'] ?? ''),
            'city' => (string) ($payload['localidade'] ?? ''),
            'state' => (string) ($payload['uf'] ?? ''),
            'complement' => (string) ($payload['complemento'] ?? ''),
        ];
    }
}
