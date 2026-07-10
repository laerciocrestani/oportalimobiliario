export function formatPrice(value: string | null): string {
  if (!value) {
    return '—'
  }

  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatLocation(city: string | null, state: string | null): string {
  const parts = [city, state].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : 'Localização sob consulta'
}
