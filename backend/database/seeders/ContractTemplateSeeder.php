<?php

namespace Database\Seeders;

use App\Models\ContractTemplate;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class ContractTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $alpha = Tenant::query()->where('slug', 'construtora-alpha')->first();

        if ($alpha === null) {
            return;
        }

        ContractTemplate::query()->firstOrCreate(
            [
                'tenant_id' => $alpha->id,
                'name' => 'Compra e venda padrão',
            ],
            [
                'body_markdown' => <<<'MD'
# Contrato de compra e venda

Empreendimento **{{nome_empreendimento}}**, unidade **{{codigo_unidade}}**.

Comprador: {{nome_cliente}}, CPF {{cpf_cliente}}, residente em {{endereco_cliente}}, {{cidade_cliente}}/{{uf_cliente}}.

Valor do contrato: R$ {{preco_final}}.

Condições de pagamento: {{condicoes_pagamento}}.

Corretor responsável: {{nome_corretor}}.

Data de emissão: {{data_emissao}}.
MD,
                'custom_variables' => [],
                'is_active' => true,
            ],
        );
    }
}
