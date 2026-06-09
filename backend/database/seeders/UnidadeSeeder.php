<?php

namespace Database\Seeders;

use App\Enums\UnidadeStatus;
use App\Models\Empreendimento;
use App\Models\Unidade;
use Illuminate\Database\Seeder;

class UnidadeSeeder extends Seeder
{
    public function run(): void
    {
        $aurora = Empreendimento::query()->where('nome', 'Residencial Aurora')->first();

        if ($aurora === null) {
            return;
        }

        foreach (['101', '102', '201'] as $codigo) {
            Unidade::query()->firstOrCreate(
                ['empreendimento_id' => $aurora->id, 'codigo' => $codigo],
                [
                    'tenant_id' => $aurora->tenant_id,
                    'andar' => (int) substr($codigo, 0, 1),
                    'area_m2' => 72.5,
                    'preco' => 450000,
                    'status' => UnidadeStatus::Disponivel,
                ],
            );
        }
    }
}
