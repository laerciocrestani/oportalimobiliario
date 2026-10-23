import { cnpjDigits, cpfDigits, isValidCnpj, isValidCpf } from '@/lib/br-docs'
import { isValidEmail } from '@/lib/format-phone'
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

export function missingProposalPartyFields(
  form: ProposalPartyForm,
  contact: { name: string; phone: string; email: string },
): string[] {
  const company = form.kind === 'company'
  const missing: string[] = []

  if (company) {
    if (!isValidCnpj(form.document)) {
      missing.push('CNPJ')
    }
  } else if (!isValidCpf(form.document)) {
    missing.push('CPF')
  }

  if (contact.name.trim() === '') {
    missing.push(company ? 'Razão social' : 'Nome')
  }

  if (contact.phone.trim() === '') {
    missing.push('Telefone')
  }

  if (contact.email.trim() !== '' && !isValidEmail(contact.email)) {
    missing.push('E-mail')
  }

  if (!company) {
    if (form.rg.trim() === '') {
      missing.push('RG')
    }

    if (form.maritalStatus.trim() === '') {
      missing.push('Estado civil')
    }

    if (form.nationality.trim() === '') {
      missing.push('Nacionalidade')
    }

    if (form.profession.trim() === '') {
      missing.push('Profissão')
    }

    if (form.maritalStatus === MARRIED_STATUS) {
      if (form.spouseName.trim() === '') {
        missing.push('Nome do cônjuge')
      }

      if (!isValidCpf(form.spouseCpf)) {
        missing.push('CPF do cônjuge')
      }
    }
  }

  if (cepDigits(form.zip).length !== 8) {
    missing.push('CEP')
  }

  if (form.city.trim() === '') {
    missing.push('Cidade')
  }

  if (form.state.trim().length !== 2) {
    missing.push('UF')
  }

  if (form.address.trim() === '') {
    missing.push('Endereço')
  }

  return missing
}
