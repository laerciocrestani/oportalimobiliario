<?php

namespace Database\Factories;

use App\Enums\InccIndexSource;
use App\Models\InccIndex;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<InccIndex>
 */
class InccIndexFactory extends Factory
{
    protected $model = InccIndex::class;

    public function definition(): array
    {
        return [
            'competence' => Carbon::createFromDate(2000, 1, 1)
                ->addMonths(fake()->unique()->numberBetween(0, 400))
                ->startOfMonth()
                ->toDateString(),
            'value' => fake()->randomFloat(6, 800, 1500),
            'source' => InccIndexSource::Manual,
            'fetched_at' => null,
        ];
    }

    public function fromJob(): static
    {
        return $this->state(fn () => [
            'source' => InccIndexSource::Job,
            'fetched_at' => now(),
        ]);
    }

    public function manual(): static
    {
        return $this->state(fn () => [
            'source' => InccIndexSource::Manual,
            'fetched_at' => null,
        ]);
    }
}
