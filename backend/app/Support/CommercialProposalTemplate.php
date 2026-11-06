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
# PROPOSTA DE COMPRA DE IMÓVEL

Documento Particular

**Local e Data:** {{local_data}}

## 1. DAS PARTES

**COMPRADOR:** {{qualificacao_comprador}}

**CORRETOR:** {{qualificacao_corretor}}

**CONSTRUTORA / VENDEDORA:** {{qualificacao_construtora}}

## 2. DO OBJETO

O presente instrumento tem por objeto a proposta de compra do seguinte imóvel:

{{descricao_imovel}}

{dados_unidade}

{{texto_matricula}}

## 3. DO PREÇO E FORMA DE PAGAMENTO

O valor total proposto para a compra do imóvel é de R$ {{preco_por_extenso}} (R$ {{preco_final}}), a ser pago da seguinte forma:

{{condicoes_pagamento}}

{bloco_preco_unidade}

{bloco_preco_vaga}

{correcao_parcelas}

{reforcos}

{correcao_reforcos}

{dacoes}

## 4. DAS CONDIÇÕES

**4.1.** A presente proposta tem validade de 15 (quinze) dias a contar da data de sua assinatura.

**4.2.** A aceitação desta proposta pela Construtora/Vendedora implicará na obrigação de formalizar o contrato de promessa de compra e venda no prazo de 10 (dez) dias úteis.

**4.3.** O imóvel será entregue livre e desembaraçado de quaisquer ônus, dívidas ou pendências.

**4.4.** As despesas com escritura, registro, ITBI e demais taxas correrão por conta do Comprador, salvo disposição em contrário no contrato definitivo.

**4.5.** Esta proposta não gera obrigação definitiva até a assinatura do contrato de promessa de compra e venda pelas partes.

E, por estarem assim justas e contratadas, as partes assinam a presente proposta em 03 (três) vias de igual teor e forma, na presença das testemunhas abaixo.
MD;
    }

    /**
     * @return list<array{slug: string, label: string}>
     */
    public static function variables(): array
    {
        return [
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
