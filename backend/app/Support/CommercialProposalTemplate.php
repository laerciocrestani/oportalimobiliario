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

**Valor de entrada:** R$ {{valor_entrada}} · **Venc.:** {{vencimento_entrada?}}

**Parcelas:** {{parcelas_quantidade}} x R$ {{parcela_valor}} (R$ {{parcelas_total?}})

**Primeiro venc.:** {{primeiro_vencimento?}}

{correcao_parcelas}

### Reforços

{reforcos}

**Total:** R$ {{reforcos_total?}}

{correcao_reforcos}

{dacoes}

**OBS:** {{observacoes?}}

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
            ['slug' => 'valor_entrada', 'label' => 'Valor de entrada'],
            ['slug' => 'vencimento_entrada', 'label' => 'Vencimento da entrada'],
            ['slug' => 'parcelas_quantidade', 'label' => 'Qtd.'],
            ['slug' => 'parcela_valor', 'label' => 'Valor'],
            ['slug' => 'parcelas_total', 'label' => 'Total'],
            ['slug' => 'primeiro_vencimento', 'label' => 'Primeiro vencimento'],
            ['slug' => 'reforcos_total', 'label' => 'Total dos reforços'],
            ['slug' => 'observacoes', 'label' => 'Observações'],
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
