<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Reads the latest INCC-M observation from BCB SGS. Never used to price units.
 *
 * @see REQ-WIZ-012
 * @see REQ-WIZ-013
 */
class BcbInccClient
{
    /**
     * Values below this absolute threshold are treated as monthly variation (%), not an index.
     */
    private const INDEX_ABS_MIN = 50.0;

    /**
     * @return array{competence: string, value: string}|null
     */
    public function latest(): ?array
    {
        $seriesId = (int) config('opim.incc.bcb_series_id');
        $timeout = max(1, (int) config('opim.incc.bcb_timeout', 5));

        try {
            $response = Http::timeout($timeout)
                ->connectTimeout(2)
                ->acceptJson()
                ->get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.{$seriesId}/dados/ultimos/1", [
                    'formato' => 'json',
                ]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('BCB SGS unavailable.', 0, $exception);
        }

        if (! $response->successful()) {
            throw new RuntimeException('BCB SGS unavailable.');
        }

        $payload = $response->json();

        if (! is_array($payload) || $payload === []) {
            return null;
        }

        $row = $payload[array_key_last($payload)];

        if (! is_array($row) || ! isset($row['data'], $row['valor'])) {
            return null;
        }

        $competence = Carbon::createFromFormat('d/m/Y', (string) $row['data']);

        if ($competence === null) {
            return null;
        }

        $value = (string) $row['valor'];

        if ($value === '' || ! is_numeric($value)) {
            return null;
        }

        return [
            'competence' => $competence->startOfMonth()->toDateString(),
            'value' => number_format((float) $value, 6, '.', ''),
        ];
    }

    public function isIndexNumber(string $value): bool
    {
        return abs((float) $value) >= self::INDEX_ABS_MIN;
    }
}
