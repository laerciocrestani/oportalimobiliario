<?php

namespace App\Services;

use App\Models\Building;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class BuildingDescriptionGenerator
{
    public function generate(Building $building): string
    {
        $provider = (string) config('opim.llm.provider', 'gemini');
        $prompt = $this->prompt($building);

        try {
            $text = match ($provider) {
                'openai' => $this->fromOpenAi($prompt),
                default => $this->fromGemini($prompt),
            };
        } catch (ConnectionException $exception) {
            throw new RuntimeException('Description generation unavailable.', 0, $exception);
        }

        $text = trim($text);

        if ($text === '') {
            throw new RuntimeException('Description generation unavailable.');
        }

        return $text;
    }

    private function prompt(Building $building): string
    {
        $building->loadMissing([
            'towers' => fn ($query) => $query->orderBy('sort_order')->orderBy('name'),
        ]);

        $address = collect([
            $building->street,
            $building->number,
            $building->neighborhood,
            filled($building->city) && filled($building->state)
                ? "{$building->city}/{$building->state}"
                : ($building->city ?: $building->state),
            $building->zip,
        ])->filter()->implode(', ');

        $towers = $building->towers
            ->map(function ($tower): string {
                $floors = $tower->floors_count ?? 0;

                return "- {$tower->name}: {$floors} andar(es)";
            })
            ->implode("\n");

        if ($towers === '') {
            $towers = '- ainda não informadas';
        }

        $addressLine = $address !== '' ? $address : 'não informado';

        return <<<PROMPT
Escreva um descritivo comercial em português do Brasil (2 a 4 parágrafos curtos) para anúncio de empreendimento imobiliário.
Use apenas os dados abaixo. Não invente endereço, quantidade de torres, andares, áreas, preços ou diferenciais.
Não inclua dados pessoais. Tom profissional, adequado a um portal de vendas.

Nome: {$building->name}
Endereço: {$addressLine}
Torres:
{$towers}
PROMPT;
    }

    private function timeout(): int
    {
        return max(1, (int) config('opim.llm.timeout', 8));
    }

    private function fromGemini(string $prompt): string
    {
        $apiKey = (string) config('opim.llm.gemini_api_key');
        $model = (string) config('opim.llm.gemini_model', 'gemini-2.0-flash');

        if ($apiKey === '') {
            throw new RuntimeException('Description generation unavailable.');
        }

        $response = Http::timeout($this->timeout())
            ->connectTimeout(2)
            ->acceptJson()
            ->asJson()
            ->post(
                'https://generativelanguage.googleapis.com/v1beta/models/'.$model.':generateContent?key='.urlencode($apiKey),
                [
                    'contents' => [
                        ['parts' => [['text' => $prompt]]],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'maxOutputTokens' => 800,
                    ],
                ],
            );

        if (! $response->successful()) {
            throw new RuntimeException('Description generation unavailable.');
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text');

        return is_string($text) ? $text : '';
    }

    private function fromOpenAi(string $prompt): string
    {
        $apiKey = (string) config('opim.llm.openai_api_key');
        $model = (string) config('opim.llm.openai_model', 'gpt-4o-mini');

        if ($apiKey === '') {
            throw new RuntimeException('Description generation unavailable.');
        }

        $response = Http::timeout($this->timeout())
            ->connectTimeout(2)
            ->acceptJson()
            ->asJson()
            ->withToken($apiKey)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'temperature' => 0.7,
                'max_tokens' => 800,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Description generation unavailable.');
        }

        $text = data_get($response->json(), 'choices.0.message.content');

        return is_string($text) ? $text : '';
    }
}
