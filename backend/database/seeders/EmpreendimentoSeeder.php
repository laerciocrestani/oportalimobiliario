<?php

namespace Database\Seeders;

use App\Models\Empreendimento;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class EmpreendimentoSeeder extends Seeder
{
    public function run(): void
    {
        $alpha = Tenant::query()->where('slug', 'construtora-alpha')->first();

        if ($alpha === null) {
            return;
        }

        Empreendimento::query()->firstOrCreate(
            ['tenant_id' => $alpha->id, 'nome' => 'Residencial Aurora'],
            [
                'descricao' => 'Empreendimento demo com unidades variadas.',
                'cidade' => 'São Paulo',
                'estado' => 'SP',
                'publicado' => true,
                'seo_title' => 'Residencial Aurora — Lançamento SP',
                'seo_description' => 'Conheça o Residencial Aurora, lançamento exclusivo em São Paulo.',
            ],
        );

        Empreendimento::query()->firstOrCreate(
            ['tenant_id' => $alpha->id, 'nome' => 'Edifício Horizonte'],
            [
                'descricao' => 'Empreendimento interno, não publicado.',
                'cidade' => 'Campinas',
                'estado' => 'SP',
                'publicado' => false,
            ],
        );
    }
}
