import { describe, expect, it } from 'vitest'
import type { BrokerProposalTemplate } from '@/lib/api'
import { prefillProposalValues, renderProposalPlainText, commercialTermsFromValues } from '@/apps/broker/lib/fill-proposal-template'

const template: BrokerProposalTemplate = {
  id: 1,
  name: 'Padrão',
  body_markdown: '# Proposta\n\nCliente **{{nome_cliente}}**, {{telefone_cliente}}.\n\nCondições: {{condicoes_pagamento}}.',
  variables: [
    { slug: 'nome_cliente', label: 'Nome do cliente' },
    { slug: 'telefone_cliente', label: 'Telefone do cliente' },
    { slug: 'condicoes_pagamento', label: 'Condições de pagamento' },
  ],
  prefill: {
    nome_cliente: 'Ana API',
    telefone_cliente: '11988888888',
  },
}

describe('prefillProposalValues', () => {
  it('prefers the attached client over the api prefill and leaves other fields empty', () => {
    expect(
      prefillProposalValues(template, {
        name: 'Ana Silva',
        phone: '(11) 88888-8888',
        email: '',
      }),
    ).toEqual({
      nome_cliente: 'Ana Silva',
      telefone_cliente: '(11) 88888-8888',
      condicoes_pagamento: '',
    })
  })

  it('keeps the api prefill when the client field is blank', () => {
    expect(
      prefillProposalValues(template, { name: '', phone: '', email: '' }).nome_cliente,
    ).toBe('Ana API')
  })

  it('fills the unit code and the building name from the reservation', () => {
    const withPlace = {
      ...template,
      variables: [
        ...template.variables,
        { slug: 'codigo_unidade', label: 'Código da unidade' },
        { slug: 'nome_empreendimento', label: 'Nome do empreendimento' },
      ],
    }

    const values = prefillProposalValues(withPlace, {
      name: 'Ana Silva',
      phone: '(11) 88888-8888',
      email: '',
      unitCode: '1201',
      buildingName: 'Residencial Bosque',
    })

    expect(values.codigo_unidade).toBe('1201')
    expect(values.nome_empreendimento).toBe('Residencial Bosque')
  })
})

describe('renderProposalPlainText', () => {
  it('replaces placeholders and strips markdown markers', () => {
    expect(
      renderProposalPlainText(template.body_markdown, {
        nome_cliente: 'Ana Silva',
        telefone_cliente: '(11) 88888-8888',
        condicoes_pagamento: 'Entrada de R$ 50.000',
      }),
    ).toBe('Proposta\n\nCliente Ana Silva, (11) 88888-8888.\n\nCondições: Entrada de R$ 50.000.')
  })

  it('leaves unit, box and broker out of the proposal text', () => {
    const text = renderProposalPlainText(
      'Cliente {{nome_cliente}}\n\nEmpreendimento {{nome_empreendimento}}\n\nUnidade {{codigo_unidade}} · Box {{box}}\n\nCorretor {{nome_corretor}}\n\nEntrada {{valor_entrada}}',
      {
        nome_cliente: 'Ana Silva',
        nome_empreendimento: 'Bosque',
        codigo_unidade: '1201',
        box: 'S1-01',
        nome_corretor: 'Danilo',
        valor_entrada: '50000',
      },
    )

    expect(text).toBe('Cliente Ana Silva\n\nEntrada 50000')
    expect(text).not.toContain('Bosque')
    expect(text).not.toContain('S1-01')
  })

  it('expands reinforcement and dation modules and skips blank rows', () => {
    const text = renderProposalPlainText(
      '### Reforços\n\n{reforcos}\n\nTotal {{reforcos_total}}\n\n{dacoes}',
      {
        reforco_1_valor: '10000',
        reforco_1_vencimento: '10/11/2026',
        reforco_3_valor: '5000',
        reforco_3_vencimento: '10/12/2026',
        reforcos_total: '15000',
        dacao_1: 'Apartamento',
      },
    )

    expect(text).toBe(
      'Reforços\n\nValor: R$ 10000 · Venc.: 10/11/2026\nValor: R$ 5000 · Venc.: 10/12/2026\n\nTotal 15000\n\nDação 1: Apartamento',
    )
  })

  it('replaces the fixed reinforcement lines with the filled rows', () => {
    const text = renderProposalPlainText(
      '**Valor:** R$ {{reforco_1_valor?}} · **Venc.:** {{reforco_1_vencimento?}}\n\n**Valor:** R$ {{reforco_2_valor?}} · **Venc.:** {{reforco_2_vencimento?}}',
      {
        reforco_1_valor: '1000',
        reforco_1_vencimento: '01/01/2027',
        reforco_2_valor: '2000',
        reforco_2_vencimento: '01/02/2027',
      },
    )

    expect(text).toBe('Valor: R$ 1000 · Venc.: 01/01/2027\nValor: R$ 2000 · Venc.: 01/02/2027')
  })
})

describe('commercialTermsFromValues', () => {
  it('keeps filled rows and drops blank ones', () => {
    expect(commercialTermsFromValues({
      reforco_1_valor: '10.000,00',
      reforco_1_vencimento: '10/11/2026',
      reforco_2_valor: '',
      reforco_2_vencimento: '',
      reforco_3_valor: '5.000,00',
      reforco_3_vencimento: '',
      dacao_1: 'Apartamento',
      dacao_2: '  ',
    })).toEqual({
      reinforcements: [
        { amount: '10.000,00', due_on: '10/11/2026' },
        { amount: '5.000,00', due_on: null },
      ],
      dations: ['Apartamento'],
    })
  })

  it('returns null when every row is blank', () => {
    expect(commercialTermsFromValues({})).toBeNull()
  })
})
