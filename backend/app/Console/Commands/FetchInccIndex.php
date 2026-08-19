<?php

namespace App\Console\Commands;

use App\Enums\InccIndexSource;
use App\Models\InccIndex;
use App\Services\BcbInccClient;
use Illuminate\Console\Command;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * @see REQ-WIZ-012
 */
class FetchInccIndex extends Command
{
    protected $signature = 'opim:fetch-incc';

    protected $description = 'Fetch the latest INCC-M observation from BCB SGS and insert if the competence is new';

    public function handle(BcbInccClient $client): int
    {
        try {
            $observation = $client->latest();
        } catch (Throwable $exception) {
            Log::warning('opim:fetch-incc skipped: BCB SGS unavailable.', [
                'exception' => $exception->getMessage(),
            ]);
            $this->warn('BCB SGS unavailable; skipped.');

            return self::SUCCESS;
        }

        if ($observation === null) {
            $this->info('No INCC-M observation returned; skipped.');

            return self::SUCCESS;
        }

        if (! $client->isIndexNumber($observation['value'])) {
            Log::warning('opim:fetch-incc skipped: observation looks like monthly variation, not an index number.', [
                'competence' => $observation['competence'],
                'value' => $observation['value'],
            ]);
            $this->warn('Observation looks like monthly variation (%); skipped persist.');

            return self::SUCCESS;
        }

        $exists = InccIndex::query()
            ->whereDate('competence', $observation['competence'])
            ->exists();

        if ($exists) {
            $this->info("Competence {$observation['competence']} already stored; skipped.");

            return self::SUCCESS;
        }

        try {
            InccIndex::query()->create([
                'competence' => $observation['competence'],
                'value' => $observation['value'],
                'source' => InccIndexSource::Job,
                'fetched_at' => now(),
            ]);
        } catch (UniqueConstraintViolationException) {
            $this->info("Competence {$observation['competence']} already stored; skipped.");

            return self::SUCCESS;
        }

        $this->info("Inserted INCC-M competence {$observation['competence']}.");

        return self::SUCCESS;
    }
}
