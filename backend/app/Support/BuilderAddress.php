<?php

namespace App\Support;

use App\Models\Building;
use Illuminate\Support\Collection;

class BuilderAddress
{
    /**
     * Endereço público da construtora a partir dos empreendimentos publicados.
     *
     * A rua só entra quando todos compartilham a mesma. Caso contrário, a linha
     * lista as cidades, porque o tenant não tem sede cadastrada.
     *
     * @param  Collection<int, Building>  $buildings
     */
    public static function fromBuildings(Collection $buildings): ?string
    {
        $places = $buildings
            ->map(fn (Building $building): ?string => self::place($building))
            ->filter(fn (?string $place): bool => $place !== null)
            ->unique(strict: true)
            ->sortBy(fn (string $place): string => mb_strtolower($place))
            ->values();

        if ($places->isEmpty()) {
            return null;
        }

        $streets = $buildings
            ->map(fn (Building $building): ?string => self::streetLine($building))
            ->unique(strict: true)
            ->values();

        if ($places->count() === 1 && $streets->count() === 1 && is_string($streets->first())) {
            return $streets->first().' — '.$places->first();
        }

        return self::join($places->all());
    }

    private static function place(Building $building): ?string
    {
        $parts = array_values(array_filter(
            [trim((string) $building->city), trim((string) $building->state)],
            fn (string $part): bool => $part !== '',
        ));

        return $parts === [] ? null : implode(', ', $parts);
    }

    private static function streetLine(Building $building): ?string
    {
        $street = trim((string) $building->street);

        if ($street === '') {
            return null;
        }

        $number = trim((string) $building->number);
        $line = $number !== '' ? "{$street}, {$number}" : $street;
        $neighborhood = trim((string) $building->neighborhood);

        if ($neighborhood !== '') {
            $line .= ", {$neighborhood}";
        }

        return $line;
    }

    /**
     * @param  list<string>  $items
     */
    private static function join(array $items): string
    {
        if (count($items) === 1) {
            return $items[0];
        }

        $last = array_pop($items);

        return implode(', ', $items).' e '.$last;
    }
}
