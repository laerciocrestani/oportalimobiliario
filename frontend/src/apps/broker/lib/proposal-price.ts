export const ADJUSTED_UNIT_PRICE_SLUGS = ['preco_unidade_original', 'preco_unidade_corrigido'] as const
export const ADJUSTED_GARAGE_PRICE_SLUGS = ['preco_vaga_original', 'preco_vaga_corrigido'] as const

export const PROPOSAL_ADJUSTED_PRICE_SLUGS = new Set<string>([
  ...ADJUSTED_UNIT_PRICE_SLUGS,
  ...ADJUSTED_GARAGE_PRICE_SLUGS,
])

type GaragePrice = {
  code: string
  original: number | null
  amount: number | null
}

function cents(amount: number): number {
  return Math.round(amount * 100)
}

export function formatProposalAmount(amount: number): string {
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseProposalAmount(raw: string): number | null {
  const cleaned = raw.replace(/\u00a0/g, '').replace(/\s/g, '').replace(/R\$/gi, '')

  if (cleaned === '') {
    return null
  }

  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/\./g, '')

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null
  }

  const value = Number(normalized)

  if (!Number.isFinite(value) || value < 0) {
    return null
  }

  return cents(value) / 100
}

function sameAmount(left: number | null, right: number | null): boolean {
  return left != null && right != null && cents(left) === cents(right)
}

function formatGarageList(spots: { code: string; amount: number }[], withCode: boolean): string {
  if (!withCode && spots.length === 1) {
    return `R$ ${formatProposalAmount(spots[0].amount)}`
  }

  return spots.map((spot) => `${spot.code}: R$ ${formatProposalAmount(spot.amount)}`).join(' · ')
}

export function buildPriceAdjustmentValues(input: {
  unitOriginal: number | null
  unitAmount: number | null
  garages: GaragePrice[]
}): Record<string, string> {
  const values: Record<string, string> = {}
  let changed = false

  if (!sameAmount(input.unitOriginal, input.unitAmount) && input.unitOriginal != null && input.unitAmount != null) {
    changed = true
    values.preco_unidade_original = formatProposalAmount(input.unitOriginal)
    values.preco_unidade_corrigido = formatProposalAmount(input.unitAmount)
  }

  const changedGarages = input.garages.flatMap((spot) => {
    if (spot.original == null || spot.amount == null || sameAmount(spot.original, spot.amount)) {
      return []
    }

    return [{ code: spot.code, original: spot.original, amount: spot.amount }]
  })

  if (changedGarages.length > 0) {
    changed = true
    const withCode = input.garages.filter((spot) => spot.original != null).length > 1
    values.preco_vaga_original = formatGarageList(
      changedGarages.map((spot) => ({ code: spot.code, amount: spot.original })),
      withCode,
    )
    values.preco_vaga_corrigido = formatGarageList(
      changedGarages.map((spot) => ({ code: spot.code, amount: spot.amount })),
      withCode,
    )
  }

  if (changed && input.unitAmount != null) {
    const garageSum = input.garages.reduce((sum, spot) => sum + (spot.amount ?? 0), 0)
    const hasGarage = input.garages.some((spot) => spot.amount != null)
    const total = hasGarage ? input.unitAmount + garageSum : input.unitAmount
    values.preco_final = formatProposalAmount(cents(total) / 100)
  }

  return values
}

export function adjustedPriceLines(values: Record<string, string>): string[] {
  const lines: string[] = []
  const unitCorrected = values.preco_unidade_corrigido?.trim() ?? ''
  const unitOriginal = values.preco_unidade_original?.trim() ?? ''

  if (unitCorrected !== '' && unitOriginal !== '') {
    lines.push(`Valor corrigido da unidade: R$ ${unitCorrected} (original R$ ${unitOriginal})`)
  }

  const garageCorrected = values.preco_vaga_corrigido?.trim() ?? ''
  const garageOriginal = values.preco_vaga_original?.trim() ?? ''

  if (garageCorrected !== '' && garageOriginal !== '') {
    lines.push(`Valor corrigido da vaga: ${garageCorrected} (original ${garageOriginal})`)
  }

  return lines
}

export function appendAdjustedPrices(terms: string, values: Record<string, string>): string {
  const lines = adjustedPriceLines(values).filter((line) => !terms.includes(line))

  if (lines.length === 0) {
    return terms
  }

  const base = terms.trim()

  return base === '' ? lines.join('\n') : `${base}\n\n${lines.join('\n')}`
}
