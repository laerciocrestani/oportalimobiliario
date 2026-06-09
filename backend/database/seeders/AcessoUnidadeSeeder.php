<?php

namespace Database\Seeders;

use App\Models\AcessoUnidade;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Database\Seeder;

class AcessoUnidadeSeeder extends Seeder
{
    public function run(): void
    {
        $corretor = User::query()->where('email', 'corretor@demo.com')->first();
        $unidade = Unidade::query()->where('codigo', '101')->first();

        if ($corretor === null || $unidade === null) {
            return;
        }

        AcessoUnidade::query()->firstOrCreate(
            ['corretor_id' => $corretor->id, 'unidade_id' => $unidade->id],
            ['tenant_id' => $unidade->tenant_id],
        );
    }
}
