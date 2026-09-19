<?php

namespace Database\Seeders;

use App\Enums\FloorKind;
use App\Enums\ReservationStatus;
use App\Enums\UnitStatus;
use App\Models\BuildingAccess;
use App\Models\Reservation;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ReservationSeeder extends Seeder
{
    /**
     * @return list<array{building: string, code: string, broker_email: string, expires_in_hours: int, garage_code?: string}>
     */
    public static function definitions(): array
    {
        return [
            ['building' => 'Residencial Bosque', 'code' => '101', 'broker_email' => 'corretor@demo.com', 'expires_in_hours' => 48, 'garage_code' => 'S1-01'],
            ['building' => 'Residencial Aurora', 'code' => '102', 'broker_email' => 'corretor@demo.com', 'expires_in_hours' => 48],
            ['building' => 'Residencial Parque das Flores', 'code' => 'G-02', 'broker_email' => 'corretor@demo.com', 'expires_in_hours' => 36],
            ['building' => 'Torre Vista Mar', 'code' => '1202', 'broker_email' => 'corretor@demo.com', 'expires_in_hours' => 24],
            ['building' => 'Condomínio Jardim Europa', 'code' => '601', 'broker_email' => 'corretor@demo.com', 'expires_in_hours' => 12],
            ['building' => 'Residencial Bela Vista', 'code' => '1102', 'broker_email' => 'corretor@demo.com', 'expires_in_hours' => 48],
            ['building' => 'Residencial Beta Norte', 'code' => '102', 'broker_email' => 'corretor@demo.com', 'expires_in_hours' => 48],
        ];
    }

    public function run(): void
    {
        $this->releaseExistingGarageAttachments();

        Reservation::query()->delete();

        $ttlHours = (int) config('opim.reservation_ttl_hours', 48);

        foreach (self::definitions() as $definition) {
            $broker = User::query()->where('email', $definition['broker_email'])->first();
            $unit = Unit::query()
                ->where('code', $definition['code'])
                ->whereHas('building', fn ($query) => $query->where('name', $definition['building']))
                ->first();

            if ($broker === null || $unit === null) {
                continue;
            }

            if (! $this->brokerHasAccess($broker, $unit)) {
                continue;
            }

            $unit->update(['status' => UnitStatus::Reserved]);

            $reservation = Reservation::query()->updateOrCreate(
                ['unit_id' => $unit->id],
                [
                    'tenant_id' => $unit->tenant_id,
                    'broker_id' => $broker->id,
                    'status' => ReservationStatus::Confirmed,
                    'expires_at' => now()->addHours($definition['expires_in_hours'] ?? $ttlHours),
                ],
            );

            $this->attachGarage($reservation, $unit, $definition['garage_code'] ?? null);
        }
    }

    private function brokerHasAccess(User $broker, Unit $unit): bool
    {
        if (UnitAccess::query()
            ->where('broker_id', $broker->id)
            ->where('unit_id', $unit->id)
            ->exists()) {
            return true;
        }

        return BuildingAccess::query()
            ->where('broker_id', $broker->id)
            ->where('building_id', $unit->building_id)
            ->exists();
    }

    private function attachGarage(Reservation $reservation, Unit $primary, ?string $preferredCode): void
    {
        $garageQuery = Unit::query()
            ->where('building_id', $primary->building_id)
            ->whereHas('floorRecord', fn ($query) => $query->where('kind', FloorKind::Garage->value))
            ->where('status', UnitStatus::Available)
            ->orderBy('code');

        if ($preferredCode !== null) {
            $garage = (clone $garageQuery)->where('code', $preferredCode)->first()
                ?? $garageQuery->first();
        } else {
            $garage = $garageQuery->first();
        }

        if ($garage === null) {
            return;
        }

        $garage->update(['status' => UnitStatus::Reserved]);
        $reservation->garageUnits()->syncWithoutDetaching([
            $garage->id => ['tenant_id' => $reservation->tenant_id],
        ]);
    }

    private function releaseExistingGarageAttachments(): void
    {
        $garageIds = DB::table('reservation_garage_units')->pluck('unit_id');

        if ($garageIds->isEmpty()) {
            return;
        }

        Unit::query()
            ->whereIn('id', $garageIds)
            ->where('status', '!=', UnitStatus::Sold->value)
            ->update(['status' => UnitStatus::Available->value]);

        DB::table('reservation_garage_units')->delete();
    }
}
