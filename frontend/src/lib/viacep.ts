export type ViaCepAddress = {
  zip: string
  address: string
  city: string
  state: string
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 5) {
    return digits
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function cepDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}

export async function lookupCep(
  cep: string,
  signal?: AbortSignal,
): Promise<ViaCepAddress | null> {
  const digits = cepDigits(cep)

  if (digits.length !== 8) {
    return null
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal })

  if (!response.ok) {
    throw new Error('CEP lookup failed')
  }

  const data = (await response.json()) as {
    erro?: boolean
    logradouro?: string
    localidade?: string
    uf?: string
  }

  if (data.erro) {
    return null
  }

  return {
    zip: formatCep(digits),
    address: data.logradouro?.trim() ?? '',
    city: data.localidade?.trim() ?? '',
    state: data.uf?.trim().toUpperCase() ?? '',
  }
}
