<?php

namespace App\Services;

use App\Models\InccIndex;
use App\Models\Unit;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Computes the INCC-M display price on read. Does not persist the result.
 *
 * @see REQ-WIZ-011
 * @see REQ-WIZ-016
 */
class UnitPriceCalculator
{
    /** @var Collection<int, InccIndex>|null */
    private ?Collection $catalog = null;

    public function decorate(Unit $unit): Unit
    {
        $resolved = $this->resolve($unit);

        $unit->setAttribute('price', $resolved['price']);
        $unit->setAttribute('price_incc_current', $resolved['price_incc_current']);

        return $unit;
    }

    /**
     * @param  iterable<int, mixed>  $units
     */
    public function decorateMany(iterable $units): void
    {
        foreach ($units as $unit) {
            if ($unit instanceof Unit) {
                $this->decorate($unit);
            }
        }
    }

    /**
     * @return array{price: ?string, price_incc_current: ?string}
     */
    public function resolve(Unit $unit): array
    {
        $current = $this->current();
        $currentValue = $current?->value;

        if ($unit->frozen_price_brl !== null) {
            return [
                'price' => $this->money($unit->frozen_price_brl),
                'price_incc_current' => $currentValue,
            ];
        }

        $base = $unit->price_base ?? $unit->getRawOriginal('price');
        $competence = $unit->price_competence;

        if ($base === null || $competence === null || $current === null) {
            return [
                'price' => null,
                'price_incc_current' => $currentValue,
            ];
        }

        $competenceIndex = $this->indexFor($competence);

        if ($competenceIndex === null || (float) $competenceIndex->value == 0.0) {
            return [
                'price' => null,
                'price_incc_current' => $currentValue,
            ];
        }

        $display = (float) $base * ((float) $current->value / (float) $competenceIndex->value);

        return [
            'price' => $this->money($display),
            'price_incc_current' => $currentValue,
        ];
    }

    public function current(): ?InccIndex
    {
        return $this->catalog()->first();
    }

    public function indexFor(CarbonInterface|string $competence): ?InccIndex
    {
        $key = $this->competenceKey($competence);

        return $this->catalog()->first(
            fn (InccIndex $index) => $this->competenceKey($index->competence) === $key,
        );
    }

    /**
     * @return Collection<int, InccIndex>
     */
    private function catalog(): Collection
    {
        return $this->catalog ??= InccIndex::query()
            ->whereNotNull('value')
            ->orderByDesc('competence')
            ->get();
    }

    private function competenceKey(CarbonInterface|string $competence): string
    {
        $date = $competence instanceof CarbonInterface
            ? $competence
            : Carbon::parse($competence);

        return $date->copy()->startOfMonth()->toDateString();
    }

    private function money(string|float $value): string
    {
        return number_format(round((float) $value, 2, PHP_ROUND_HALF_UP), 2, '.', '');
    }
}
