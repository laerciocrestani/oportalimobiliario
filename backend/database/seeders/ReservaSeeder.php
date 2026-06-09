<?php

namespace Database\Seeders;

use App\Models\Reserva;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReservaSeeder extends Seeder
{
    public function run(): void
    {
        // Reservas são criadas em runtime; seeder apenas garante estado limpo em demo.
        Reserva::query()->delete();

        $corretor = User::query()->where('email', 'corretor@demo.com')->first();
        $unidade = Unidade::query()->where('codigo', '102')->first();

        if ($corretor === null || $unidade === null) {
            return;
        }

        $unidade->update(['status' => 'reservada']);

        Reserva::query()->firstOrCreate(
            ['unidade_id' => $unidade->id],
            [
                'tenant_id' => $unidade->tenant_id,
                'corretor_id' => $corretor->id,
                'expires_at' => now()->addHours((int) config('opim.reserva_ttl_hours', 48)),
            ],
        );
    }
}
