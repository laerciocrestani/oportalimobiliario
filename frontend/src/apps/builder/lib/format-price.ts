export function formatPrice(value: string | null): string {
  if (!value) {
    return '—'
  }

  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
