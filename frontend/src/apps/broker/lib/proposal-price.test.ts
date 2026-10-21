import { describe, expect, it } from 'vitest'
import {
  appendAdjustedPrices,
  buildPriceAdjustmentValues,
  formatProposalAmount,
  parseProposalAmount,
} from '@/apps/broker/lib/proposal-price'

describe('parseProposalAmount', () => {
  it('reads brazilian amounts and rejects blanks', () => {
    expect(parseProposalAmount('520.000,00')).toBe(520000)
    expect(parseProposalAmount('R$ 520.000,00')).toBe(520000)
    expect(parseProposalAmount('520000')).toBe(520000)
    expect(parseProposalAmount('')).toBeNull()
    expect(parseProposalAmount('abc')).toBeNull()
  })
})

describe('buildPriceAdjustmentValues', () => {
  it('stays empty when the prices match the listing', () => {
    expect(buildPriceAdjustmentValues({
      unitOriginal: 520000,
      unitAmount: 520000,
      garages: [{ code: 'S1-02', original: 48000, amount: 48000 }],
    })).toEqual({})
  })

  it('records the corrected unit and the proposal total', () => {
    expect(buildPriceAdjustmentValues({
      unitOriginal: 520000,
      unitAmount: 500000,
      garages: [{ code: 'S1-02', original: 48000, amount: 48000 }],
    })).toEqual({
      preco_unidade_original: '520.000,00',
      preco_unidade_corrigido: '500.000,00',
      preco_final: '548.000,00',
    })
    expect(formatProposalAmount(500000)).toBe('500.000,00')
  })

  it('names the spot when more than one garage is priced', () => {
    expect(buildPriceAdjustmentValues({
      unitOriginal: 520000,
      unitAmount: 520000,
      garages: [
        { code: 'S1-01', original: 45000, amount: 40000 },
        { code: 'S1-02', original: 48000, amount: 48000 },
      ],
    })).toEqual({
      preco_vaga_original: 'S1-01: R$ 45.000,00',
      preco_vaga_corrigido: 'S1-01: R$ 40.000,00',
      preco_final: '608.000,00',
    })
  })
})

describe('appendAdjustedPrices', () => {
  it('adds the correction lines once', () => {
    const values = {
      preco_unidade_original: '450.000,00',
      preco_unidade_corrigido: '400.000,00',
    }
    const once = appendAdjustedPrices('Condições: entrada.', values)

    expect(once).toBe(
      'Condições: entrada.\n\nValor corrigido da unidade: R$ 400.000,00 (original R$ 450.000,00)',
    )
    expect(appendAdjustedPrices(once, values)).toBe(once)
  })
})
