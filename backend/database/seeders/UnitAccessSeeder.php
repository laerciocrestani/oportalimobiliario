<?php

namespace Database\Seeders;

use App\Models\Unit;
use App\Models\UnitAccess;
use App\Models\User;
use Illuminate\Database\Seeder;

class UnitAccessSeeder extends Seeder
{
    /**
     * @return list<array{building: string, code: string, broker_email: string}>
     */
    public static function definitions(): array
    {
        return [
            ['building' => 'Residencial Bosque', 'code' => '101', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Bosque', 'code' => '201', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Bosque', 'code' => '301', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Aurora', 'code' => '101', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Aurora', 'code' => '102', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Aurora', 'code' => '201', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Aurora', 'code' => '301', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Parque das Flores', 'code' => 'G-01', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Parque das Flores', 'code' => 'G-02', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Torre Vista Mar', 'code' => '1201', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Torre Vista Mar', 'code' => '1202', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Condomínio Jardim Europa', 'code' => '501', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Condomínio Jardim Europa', 'code' => '601', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Central Park', 'code' => '801', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Bela Vista', 'code' => '1101', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Bela Vista', 'code' => '1102', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Beta Norte', 'code' => '101', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Beta Norte', 'code' => '102', 'broker_email' => 'corretor@demo.com'],
            ['building' => 'Residencial Beta Norte', 'code' => '201', 'broker_email' => 'corretor@demo.com'],
        ];
    }

    public function run(): void
    {
        foreach (self::definitions() as $access) {
            $broker = User::query()->where('email', $access['broker_email'])->first();
            $unit = Unit::query()
                ->where('code', $access['code'])
                ->whereHas('building', fn ($query) => $query->where('name', $access['building']))
                ->first();

            if ($broker === null || $unit === null) {
                continue;
            }

            UnitAccess::query()->firstOrCreate(
                ['broker_id' => $broker->id, 'unit_id' => $unit->id],
                ['tenant_id' => $unit->tenant_id],
            );
        }
    }
}
