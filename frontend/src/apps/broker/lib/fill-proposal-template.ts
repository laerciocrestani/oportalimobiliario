import type { BrokerProposalTemplate, ProposalCommercialTerms } from '@/lib/api'
import { PROPOSAL_ADJUSTED_PRICE_SLUGS } from '@/apps/broker/lib/proposal-price'

const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\??\s*\}\}/g
const LEGACY_REINFORCEMENT_LINE =
  /^\*\*Valor:\*\*\s+R\$\s+\{\{\s*reforco_\d+_valor\s*\??\s*\}\}\s*·\s*\*\*Venc\.:\*\*\s+\{\{\s*reforco_\d+_vencimento\s*\??\s*\}\}$/
const LEGACY_DATION_LINE = /^\*\*Dação\s+\d+:\*\*\s+\{\{\s*dacao_\d+\s*\??\s*\}\}$/

export const REINFORCEMENT_MODULE = '{reforcos}'
export const DATION_MODULE = '{dacoes}'
export const MAX_REPEAT_ROWS = 12

export function reinforcementSlug(index: number, field: 'valor' | 'vencimento'): string {
  return `reforco_${index + 1}_${field}`
}

export function dationSlug(index: number): string {
  return `dacao_${index + 1}`
}

export function isReinforcementModuleLine(line: string): boolean {
  const trimmed = line.trim()

  return trimmed === REINFORCEMENT_MODULE || LEGACY_REINFORCEMENT_LINE.test(trimmed)
}

export function isDationModuleLine(line: string): boolean {
  const trimmed = line.trim()

  return trimmed === DATION_MODULE || LEGACY_DATION_LINE.test(trimmed)
}

export function reinforcementLines(values: Record<string, string>): string[] {
  const lines: string[] = []

  for (let index = 0; index < MAX_REPEAT_ROWS; index += 1) {
    const valor = (values[reinforcementSlug(index, 'valor')] ?? '').trim()
    const vencimento = (values[reinforcementSlug(index, 'vencimento')] ?? '').trim()

    if (valor === '' && vencimento === '') {
      continue
    }

    const parts = [
      valor !== '' ? `Valor: R$ ${valor}` : '',
      vencimento !== '' ? `Venc.: ${vencimento}` : '',
    ].filter((part) => part !== '')

    lines.push(parts.join(' · '))
  }

  return lines
}

export function dationLines(values: Record<string, string>): string[] {
  const lines: string[] = []

  for (let index = 0; index < MAX_REPEAT_ROWS; index += 1) {
    const description = (values[dationSlug(index)] ?? '').trim()

    if (description === '') {
      continue
    }

    lines.push(`Dação ${lines.length + 1}: ${description}`)
  }

  return lines
}

export function commercialTermsFromValues(values: Record<string, string>): ProposalCommercialTerms | null {
  const description = (values.condicoes_pagamento ?? '').trim()
  const reinforcements: ProposalCommercialTerms['reinforcements'] = []
  const dations: string[] = []

  for (let index = 0; index < MAX_REPEAT_ROWS; index += 1) {
    const amount = (values[reinforcementSlug(index, 'valor')] ?? '').trim()
    const dueOn = (values[reinforcementSlug(index, 'vencimento')] ?? '').trim()

    if (amount !== '' || dueOn !== '') {
      reinforcements.push({ amount: amount === '' ? null : amount, due_on: dueOn === '' ? null : dueOn })
    }

    const description = (values[dationSlug(index)] ?? '').trim()

    if (description !== '') {
      dations.push(description)
    }
  }

  if (description === '' && reinforcements.length === 0 && dations.length === 0) {
    return null
  }

  return {
    ...(description !== '' ? { description } : {}),
    reinforcements,
    dations,
  }
}

export function expandProposalModules(markdown: string, values: Record<string, string>): string {
  const fixed = values.correcao_modo === 'fixed'
  let reinforcementPlaced = false
  let dationPlaced = false

  return markdown
    .split('\n')
    .flatMap((line) => {
      const trimmed = line.trim()

      if (trimmed === '{bloco_preco_unidade}') {
        return priceBlockLine(
          fixed ? 'Valor da unidade' : 'Valor corrigido da unidade',
          values.preco_unidade_corrigido ?? '',
          values.preco_unidade_original ?? '',
          true,
        )
      }

      if (trimmed === '{bloco_preco_vaga}') {
        return priceBlockLine(
          fixed ? 'Valor da vaga' : 'Valor corrigido da vaga',
          values.preco_vaga_corrigido ?? '',
          values.preco_vaga_original ?? '',
          false,
        )
      }

      if (trimmed === '{correcao_parcelas}') {
        return [fixed
          ? '> As parcelas permanecem no valor contratado, sem correção pelo INCC.'
          : '> As parcelas serão corrigidas mensalmente pelo saldo positivo do INCC a partir da data de assinatura do contrato.']
      }

      if (trimmed === '{correcao_reforcos}') {
        return [fixed
          ? '> Os reforços permanecem no valor contratado, sem correção pelo INCC.'
          : '> Os reforços serão corrigidos mensalmente pelo saldo positivo do INCC a partir da data de assinatura do contrato.']
      }

      if (isReinforcementModuleLine(line)) {
        if (reinforcementPlaced) {
          return []
        }

        reinforcementPlaced = true

        return reinforcementLines(values)
      }

      if (isDationModuleLine(line)) {
        if (dationPlaced) {
          return []
        }

        dationPlaced = true

        return dationLines(values)
      }

      return [line]
    })
    .join('\n')
}

function priceBlockLine(label: string, amount: string, original: string, currency: boolean): string[] {
  const amountText = amount.trim()

  if (amountText === '') {
    return []
  }

  const shown = currency ? `R$ ${amountText}` : amountText
  const originalText = original.trim()
  const originalShown = currency ? `R$ ${originalText}` : originalText
  const suffix = originalText === '' ? '' : ` (original ${originalShown})`

  return [`**${label}:** ${shown}${suffix}`]
}

export const PROPOSAL_CONTEXT_SLUGS = new Set([
  'nome_empreendimento',
  'codigo_unidade',
  'box',
  'imobiliaria',
  'nome_corretor',
  'data_emissao',
])

export const PROPOSAL_PARTY_SLUGS = new Set([
  'nome_cliente',
  'telefone_cliente',
  'email_cliente',
  'cpf_cliente',
  'rg_cliente',
  'estado_civil',
  'nacionalidade_cliente',
  'profissao_cliente',
  'endereco_cliente',
  'cidade_cliente',
  'uf_cliente',
  'cep_cliente',
])

export function isHiddenProposalSlug(slug: string): boolean {
  return PROPOSAL_CONTEXT_SLUGS.has(slug)
    || PROPOSAL_PARTY_SLUGS.has(slug)
    || PROPOSAL_ADJUSTED_PRICE_SLUGS.has(slug)
    || slug === 'preco_final'
}

function placeholderSlugs(line: string): string[] {
  return [...line.matchAll(/\{\{\s*([a-z][a-z0-9_]*)\s*\??\s*\}\}/g)].map((match) => match[1])
}

export function omitHiddenProposalLines(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => {
      const slugs = placeholderSlugs(line)
      if (slugs.length === 0) {
        return true
      }

      return slugs.some((slug) => !isHiddenProposalSlug(slug))
    })
    .join('\n')
}

export type ProposalClientPrefill = {
  name: string
  phone: string
  email: string
  unitCode?: string
  buildingName?: string
}

export function prefillProposalValues(
  template: BrokerProposalTemplate,
  client: ProposalClientPrefill,
): Record<string, string> {
  const fromClient: Record<string, string> = {
    nome_cliente: client.name.trim(),
    telefone_cliente: client.phone.trim(),
    email_cliente: client.email.trim(),
    codigo_unidade: client.unitCode?.trim() ?? '',
    nome_empreendimento: client.buildingName?.trim() ?? '',
  }

  const values: Record<string, string> = {}

  for (const variable of template.variables) {
    const clientValue = fromClient[variable.slug] ?? ''
    const apiValue = template.prefill[variable.slug]?.trim() ?? ''
    values[variable.slug] = clientValue !== '' ? clientValue : apiValue
  }

  return values
}

export function renderProposalPlainText(markdown: string, values: Record<string, string>): string {
  const visible = expandProposalModules(markdown, values)
    .split('\n')
    .filter((line) => {
      const slugs = placeholderSlugs(line)
      if (slugs.length === 0) {
        return true
      }

      if (slugs.every((slug) => PROPOSAL_CONTEXT_SLUGS.has(slug))) {
        return false
      }

      return slugs.some((slug) => (values[slug] ?? '').trim() !== '')
    })
    .join('\n')

  const filled = visible.replace(PLACEHOLDER, (_match, slug: string) => values[slug]?.trim() ?? '')

  return filled
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
