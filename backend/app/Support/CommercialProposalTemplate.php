<?php

namespace App\Support;

use App\Models\ProposalTemplate;
use Illuminate\Support\Facades\DB;

/**
 * Uma proposta por construtora: o documento comercial padrão.
 */
class CommercialProposalTemplate
{
    public const NAME = 'Proposta comercial padrão';

    public const PAYMENT_PLACEHOLDER = "Entrada de R$ 50.000, vencimento em 10/11/2026.\n24x de R$ 8.000, total R$ 192.000, primeiro vencimento em 10/12/2026.\nTotal dos reforços: R$ 30.000.\nObservações: condições especiais desta proposta.";

    public static function body(): string
    {
        return <<<'MD'
**Data:** {{data_emissao}}

## Dados do cliente

**Cliente:** {{nome_cliente}}

**Estado civil:** {{estado_civil?}}

**Profissão:** {{profissao_cliente?}}

**CPF/CNPJ:** {{cpf_cliente?}} · **RG:** {{rg_cliente?}}

**Endereço:** {{endereco_cliente?}}

**CEP:** {{cep_cliente?}}

**Contato:** {{telefone_cliente}}

**E-mail:** {{email_cliente?}}

**Empreendimento:** {{nome_empreendimento}}

**Unidade:** {{codigo_unidade}} · **Box:** {{box?}}

**Imobiliária:** {{imobiliaria?}}

**Corretor:** {{nome_corretor}}

## Condições

**Valor total:** R$ {{preco_final}}

{bloco_preco_unidade}

{bloco_preco_vaga}

### Condições de pagamento

{{condicoes_pagamento}}

{correcao_parcelas}

### Reforços

{reforcos}

{correcao_reforcos}

{dacoes}

---

Corretor | Cliente | Construtora
MD;
    }

    /**
     * @return list<array{slug: string, label: string}>
     */
    public static function variables(): array
    {
        return [
            ['slug' => 'profissao_cliente', 'label' => 'Profissão'],
            ['slug' => 'box', 'label' => 'Box'],
            ['slug' => 'imobiliaria', 'label' => 'Imobiliária'],
            [
                'slug' => 'condicoes_pagamento',
                'label' => 'Descreva as condições de pagamento',
                'multiline' => true,
                'placeholder' => self::PAYMENT_PLACEHOLDER,
            ],
        ];
    }

    public static function sync(int $tenantId): ProposalTemplate
    {
        return DB::transaction(function () use ($tenantId): ProposalTemplate {
            $rows = DB::table('proposal_templates')
                ->where('tenant_id', $tenantId)
                ->orderBy('id')
                ->get();

            $keeper = $rows->firstWhere('name', self::NAME) ?? $rows->first();
            $payload = [
                'name' => self::NAME,
                'body_markdown' => self::body(),
                'custom_variables' => json_encode(self::variables(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'is_active' => true,
                'updated_at' => now(),
            ];

            if ($keeper === null) {
                $id = DB::table('proposal_templates')->insertGetId([
                    ...$payload,
                    'tenant_id' => $tenantId,
                    'created_at' => now(),
                ]);
            } else {
                $id = $keeper->id;
                DB::table('proposal_templates')->where('id', $id)->update($payload);
                DB::table('proposal_templates')
                    ->where('tenant_id', $tenantId)
                    ->where('id', '!=', $id)
                    ->delete();
            }

            return ProposalTemplate::query()->withoutGlobalScope('tenant')->findOrFail($id);
        });
    }
}
