<?php

namespace Database\Seeders;

use App\Enums\InccIndexSource;
use App\Models\InccIndex;
use Illuminate\Database\Seeder;

class InccIndexSeeder extends Seeder
{
    /**
     * @return list<array{competence: string, value: string, source: InccIndexSource}>
     */
    public static function definitions(): array
    {
        return [
            ['competence' => '2026-02-01', 'value' => '1000.000000', 'source' => InccIndexSource::Manual],
            ['competence' => '2026-03-01', 'value' => '1004.210000', 'source' => InccIndexSource::Manual],
            ['competence' => '2026-04-01', 'value' => '1008.450000', 'source' => InccIndexSource::Manual],
            ['competence' => '2026-05-01', 'value' => '1012.880000', 'source' => InccIndexSource::Manual],
            ['competence' => '2026-06-01', 'value' => '1016.330000', 'source' => InccIndexSource::Manual],
            ['competence' => '2026-07-01', 'value' => '1020.500000', 'source' => InccIndexSource::Manual],
        ];
    }

    public function run(): void
    {
        foreach (self::definitions() as $definition) {
            $exists = InccIndex::query()
                ->whereDate('competence', $definition['competence'])
                ->exists();

            if ($exists) {
                continue;
            }

            InccIndex::query()->create($definition);
        }
    }
}
