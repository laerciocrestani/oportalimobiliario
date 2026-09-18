<?php

namespace Database\Seeders;

use App\Models\ProposalTemplate;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class ProposalTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $alpha = Tenant::query()->where('slug', 'construtora-alpha')->first();

        if ($alpha === null) {
            return;
        }

        ProposalTemplate::query()->firstOrCreate(
            [
                'tenant_id' => $alpha->id,
                'name' => 'Proposta comercial padrão',
            ],
            [
                'body_markdown' => <<<'MD'
# Proposta comercial

Empreendimento **{{nome_empreendimento}}**, unidade **{{codigo_unidade}}**.

Proponente: {{nome_cliente}}, telefone {{telefone_cliente}}.

Condições de pagamento: {{condicoes_pagamento}}.

Valor do terreno: R$ {{valor_terreno}}.

Corretor responsável: {{nome_corretor}}.

Data de emissão: {{data_emissao}}.
MD,
                'custom_variables' => [],
                'is_active' => true,
            ],
        );
    }
}
