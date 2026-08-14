import { describe, expect, it, vi } from 'vitest'
import { cepDigits, formatCep, lookupCep } from '@/lib/viacep'

describe('viacep', () => {
  it('formats CEP with hyphen', () => {
    expect(formatCep('01001000')).toBe('01001-000')
    expect(cepDigits('01001-000')).toBe('01001000')
  })

  it('returns address from ViaCEP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          logradouro: 'Praça da Sé',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      }),
    )

    await expect(lookupCep('01001-000')).resolves.toEqual({
      zip: '01001-000',
      address: 'Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
    })

    expect(fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/', {
      signal: undefined,
    })

    vi.unstubAllGlobals()
  })

  it('returns null when ViaCEP does not find the CEP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ erro: true }),
      }),
    )

    await expect(lookupCep('00000000')).resolves.toBeNull()
    vi.unstubAllGlobals()
  })
})
