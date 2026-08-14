<?php

namespace Database\Seeders;

use App\Enums\UnitStatus;
use App\Models\Reservation;
use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReservationSeeder extends Seeder
{
    /**
     * @return list<array{building: string, code: string, broker_email: string, expires_in_hours: int}>
     */
    public static function definitions(): array
    {
        return [
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

            $hasAccess = UnitAccess::query()
                ->where('broker_id', $broker->id)
                ->where('unit_id', $unit->id)
                ->exists();

            if (! $hasAccess) {
                continue;
            }

            $unit->update(['status' => UnitStatus::Reserved]);

            Reservation::query()->updateOrCreate(
                ['unit_id' => $unit->id],
                [
                    'tenant_id' => $unit->tenant_id,
                    'broker_id' => $broker->id,
                    'status' => \App\Enums\ReservationStatus::Confirmed,
                    'expires_at' => now()->addHours($definition['expires_in_hours'] ?? $ttlHours),
                ],
            );
        }
    }
}
