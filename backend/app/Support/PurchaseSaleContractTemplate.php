<?php

namespace App\Support;

use App\Models\ContractTemplate;

/**
 * Modelo padrão de promessa de compra e venda da construtora.
 */
final class PurchaseSaleContractTemplate
{
    public const NAME = 'Compra e venda padrão';

    public static function body(): string
    {
        return <<<'MD'
# CONTRATO PARTICULAR DE PROMESSA DE COMPRA E VENDA DE IMÓVEL

Com cláusula de alienação fiduciária em garantia, quando aplicável.

Pelo presente instrumento particular de promessa de compra e venda de imóvel, de um lado, como PROMITENTE VENDEDORA, e de outro lado, como PROMITENTE COMPRADOR, têm entre si justo e contratado o seguinte:

## CLÁUSULA 1ª — DAS PARTES

**1.1. PROMITENTE VENDEDORA (CONSTRUTORA / INCORPORADORA):** {{qualificacao_construtora}}

**1.2. PROMITENTE COMPRADOR:** {{qualificacao_comprador}}

As partes acima qualificadas resolvem celebrar o presente contrato de promessa de compra e venda, que se regerá pelas cláusulas e condições seguintes.

## CLÁUSULA 2ª — DO OBJETO

**2.1. Do empreendimento:**

A Construtora é proprietária e incorporadora do empreendimento imobiliário {{texto_empreendimento}}.

**2.2. Da unidade autônoma:**

O objeto do presente contrato é a unidade autônoma abaixo discriminada, integrante do empreendimento acima descrito.

{dados_unidade}

{{texto_matricula}}

**2.3. Memorial descritivo:**

A unidade será entregue conforme o memorial descritivo aprovado e registrado, que faz parte integrante deste contrato, com as especificações de acabamentos, esquadrias, revestimentos, instalações, áreas comuns e demais itens previstos no projeto aprovado.

## CLÁUSULA 3ª — DO PREÇO E FORMA DE PAGAMENTO

**3.1.** O preço total da unidade é de {{preco_por_extenso}} (R$ {{preco_final}}), a ser pago da seguinte forma:

{{condicoes_pagamento}}

{bloco_preco_unidade}

{bloco_preco_vaga}

{correcao_parcelas}

{reforcos}

{correcao_reforcos}

{dacoes}

Índice de correção: {{indice_correcao}}.

**3.2.** Em caso de atraso no pagamento de qualquer parcela, incidirá multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária pelo índice pactuado.

## CLÁUSULA 4ª — DO PRAZO DE ENTREGA

**4.1.** A Construtora obriga-se a entregar a unidade no prazo previsto no memorial descritivo e no registro de incorporação, prorrogável por até 180 (cento e oitenta) dias, conforme a Lei nº 4.591/64.

**4.2.** A entrega será formalizada mediante termo de vistoria e recebimento, após a obtenção do habite-se e do auto de conclusão de obra.

## CLÁUSULA 5ª — DAS OBRIGAÇÕES DA CONSTRUTORA

**5.1.** Construir o empreendimento de acordo com o projeto aprovado e o memorial descritivo.

**5.2.** Obter as licenças, os alvarás e o habite-se junto aos órgãos competentes.

**5.3.** Entregar a unidade livre e desembaraçada de quaisquer ônus ou dívidas.

**5.4.** Providenciar a individualização da matrícula da unidade no Cartório de Registro de Imóveis.

**5.5.** Prestar as informações e os documentos necessários para o financiamento do comprador, quando aplicável.

## CLÁUSULA 6ª — DAS OBRIGAÇÕES DO COMPRADOR

**6.1.** Efetuar o pagamento pontual das parcelas conforme pactuado.

**6.2.** Arcar com as despesas de escritura, registro, ITBI, taxas cartorárias e demais custos de transferência.

**6.3.** Participar das assembleias do condomínio após a entrega das chaves.

**6.4.** Não realizar alterações estruturais na unidade sem prévia autorização da Construtora e do condomínio.

## CLÁUSULA 7ª — DO FINANCIAMENTO

**7.1.** Caso o comprador opte por financiamento bancário, a Construtora se compromete a fornecer a documentação necessária, inclusive a matrícula individualizada, após a solicitação formal.

**7.2.** A aprovação do financiamento é de exclusiva responsabilidade do comprador junto à instituição financeira.

## CLÁUSULA 8ª — DAS PENALIDADES

**8.1.** Em caso de desistência imotivada do comprador, este perderá em favor da Construtora o valor correspondente a 10% (dez por cento) do preço total do imóvel, a título de cláusula penal, sem prejuízo de outras perdas e danos.

**8.2.** Em caso de atraso na entrega superior ao prazo legal de tolerância, a Construtora pagará ao comprador multa de 1% (um por cento) do valor pago, por mês de atraso, limitada a 10% do valor total.

## CLÁUSULA 9ª — DAS DISPOSIÇÕES GERAIS

**9.1.** Este contrato é celebrado em caráter irrevogável e irretratável, obrigando as partes e seus sucessores.

**9.2.** Qualquer alteração deverá ser feita por escrito e assinada por ambas as partes.

**9.3.** {{texto_foro}}

E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 03 (três) vias de igual teor e forma, na presença das testemunhas abaixo assinadas.

{{local_data}}

| COMPRADOR | CORRETOR | CONSTRUTORA |
| --- | --- | --- |
| {{nome_cliente}} | {{nome_corretor}} | {{nome_construtora}} |
| CPF {{cpf_cliente}} | | |

Testemunhas:

1. Nome e CPF

2. Nome e CPF

Anexo I — Memorial descritivo do empreendimento

Anexo II — Planta da unidade

Anexo III — Cronograma de pagamento
MD;
    }

    public static function sync(int $tenantId): ContractTemplate
    {
        $template = ContractTemplate::query()
            ->withoutGlobalScope('tenant')
            ->firstOrNew([
                'tenant_id' => $tenantId,
                'name' => self::NAME,
            ]);

        $template->body_markdown = self::body();
        $template->is_active = true;

        if (! $template->exists) {
            $template->custom_variables = [];
        }

        $template->save();

        return $template;
    }
}
