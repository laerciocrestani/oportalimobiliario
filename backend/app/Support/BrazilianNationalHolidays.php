<?php

namespace App\Support;

use App\Models\NationalHoliday;
use Carbon\CarbonImmutable;
use DateTimeInterface;

/**
 * Feriados nacionais da Lei 662/1949 e da Lei 6.802/1980, mais a Sexta-feira Santa.
 * Carnaval e Corpus Christi ficam de fora: não são feriados nacionais.
 */
final class BrazilianNationalHolidays
{
    /**
     * @return array<string, string> date Y-m-d => name
     */
    public static function forYear(int $year): array
    {
        $dates = [];

        foreach ([
            '01-01' => 'Confraternização Universal',
            '04-21' => 'Tiradentes',
            '05-01' => 'Dia do Trabalho',
            '09-07' => 'Independência do Brasil',
            '10-12' => 'Nossa Senhora Aparecida',
            '11-02' => 'Finados',
            '11-15' => 'Proclamação da República',
            '12-25' => 'Natal',
        ] as $monthDay => $name) {
            $dates[sprintf('%04d-%s', $year, $monthDay)] = $name;
        }

        $easter = self::easter($year);

        $dates[$easter->subDays(2)->toDateString()] = 'Sexta-feira Santa';

        return $dates;
    }

    /**
     * Computus gregoriano. Não depende da extensão calendar do PHP.
     */
    public static function easter(int $year): CarbonImmutable
    {
        $a = $year % 19;
        $b = intdiv($year, 100);
        $c = $year % 100;
        $d = intdiv($b, 4);
        $e = $b % 4;
        $f = intdiv($b + 8, 25);
        $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intdiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $month = intdiv($h + $l - 7 * $m + 114, 31);
        $day = (($h + $l - 7 * $m + 114) % 31) + 1;

        return CarbonImmutable::create($year, $month, $day, 0, 0, 0, BusinessClock::TIMEZONE);
    }

    public static function sync(int $fromYear, int $toYear): void
    {
        foreach (range($fromYear, $toYear) as $year) {
            foreach (self::forYear($year) as $date => $name) {
                NationalHoliday::query()->updateOrCreate(
                    ['date' => $date],
                    ['name' => $name],
                );
            }
        }
    }

    /**
     * @return list<string>
     */
    public static function datesBetween(DateTimeInterface $start, DateTimeInterface $end): array
    {
        $from = CarbonImmutable::parse($start)->timezone(BusinessClock::TIMEZONE)->toDateString();
        $to = CarbonImmutable::parse($end)->timezone(BusinessClock::TIMEZONE)->toDateString();

        return NationalHoliday::query()
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->orderBy('date')
            ->pluck('date')
            ->map(fn ($date) => CarbonImmutable::parse($date)->toDateString())
            ->all();
    }
}
