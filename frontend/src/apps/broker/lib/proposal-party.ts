import { cnpjDigits, cpfDigits, isValidCnpj, isValidCpf } from '@/lib/br-docs'
import { cepDigits } from '@/lib/viacep'

export type ProposalPartyKind = 'individual' | 'company'

export type ProposalPartyForm = {
  kind: ProposalPartyKind
  document: string
  rg: string
  maritalStatus: string
  nationality: string
  profession: string
  zip: string
  address: string
  city: string
  state: string
  spouseName: string
  spouseCpf: string
}

export const MARITAL_STATUS_OPTIONS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'Separado(a)',
] as const

export const MARRIED_STATUS = 'Casado(a)'

export function emptyProposalPartyForm(): ProposalPartyForm {
  return {
    kind: 'individual',
    document: '',
    rg: '',
    maritalStatus: '',
    nationality: 'brasileira',
    profession: '',
    zip: '',
    address: '',
    city: '',
    state: '',
    spouseName: '',
    spouseCpf: '',
  }
}

export function isProposalPartyComplete(form: ProposalPartyForm): boolean {
  const addressReady = form.address.trim() !== ''
    && form.city.trim() !== ''
    && form.state.trim().length === 2
    && cepDigits(form.zip).length === 8

  if (!addressReady) {
    return false
  }

  if (form.kind === 'company') {
    return isValidCnpj(form.document)
  }

  const personReady = isValidCpf(form.document)
    && form.rg.trim() !== ''
    && form.maritalStatus.trim() !== ''
    && form.nationality.trim() !== ''
    && form.profession.trim() !== ''

  if (!personReady) {
    return false
  }

  if (form.maritalStatus !== MARRIED_STATUS) {
    return true
  }

  return form.spouseName.trim() !== '' && isValidCpf(form.spouseCpf)
}

export function partyDocumentDigits(form: ProposalPartyForm): string {
  return form.kind === 'company' ? cnpjDigits(form.document) : cpfDigits(form.document)
}
