<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use DateTimeInterface;
use InvalidArgumentException;

/**
 * Soma horas em dias úteis: 24h de segunda a sexta, pausa em sábado,
 * domingo e feriado nacional. Fuso: America/Sao_Paulo.
 */
final class BusinessClock
{
    public const TIMEZONE = 'America/Sao_Paulo';

    /**
     * @param  list<string>|null  $holidayDates  Datas Y-m-d. Null lê national_holidays.
     */
    public function addHours(DateTimeInterface $from, int $hours, ?array $holidayDates = null): CarbonImmutable
    {
        if ($hours < 0) {
            throw new InvalidArgumentException('Hours must be zero or positive.');
        }

        $cursor = CarbonImmutable::parse($from)->timezone(self::TIMEZONE);

        if ($hours === 0) {
            return $cursor;
        }

        $holidayDates ??= BrazilianNationalHolidays::datesBetween(
            $cursor,
            $cursor->addDays($hours + 60),
        );

        $closed = array_fill_keys($holidayDates, true);
        $remainingSeconds = $hours * 3600;
        $guard = 0;

        while ($remainingSeconds > 0) {
            if (++$guard > 10000) {
                throw new InvalidArgumentException('Business clock could not place the deadline.');
            }

            if ($this->isClosed($cursor, $closed)) {
                $cursor = $cursor->startOfDay()->addDay();

                continue;
            }

            $endOfDay = $cursor->startOfDay()->addDay();
            $availableSeconds = (int) $cursor->diffInSeconds($endOfDay, true);

            if ($availableSeconds === 0) {
                $cursor = $endOfDay;

                continue;
            }

            $step = min($remainingSeconds, $availableSeconds);
            $cursor = $cursor->addSeconds($step);
            $remainingSeconds -= $step;
        }

        return $cursor;
    }

    /**
     * @param  array<string, true>  $closedDates
     */
    private function isClosed(CarbonImmutable $moment, array $closedDates): bool
    {
        return $moment->isWeekend() || isset($closedDates[$moment->toDateString()]);
    }
}
