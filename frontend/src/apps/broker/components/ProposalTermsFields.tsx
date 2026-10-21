import { useState } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'
import {
  dationSlug,
  isDationModuleLine,
  isReinforcementModuleLine,
  MAX_REPEAT_ROWS,
  reinforcementSlug,
} from '@/apps/broker/lib/fill-proposal-template'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { ContractCustomVariable } from '@/lib/api'

type ProposalTermsFieldsProps = {
  body: string
  variables: ContractCustomVariable[]
  values: Record<string, string>
  disabled?: boolean
  onChange: (slug: string, value: string) => void
}

function bodyHas(body: string, match: (line: string) => boolean): boolean {
  return body.split('\n').some((line) => match(line))
}

export function ProposalTermsFields({
  body,
  variables,
  values,
  disabled = false,
  onChange,
}: ProposalTermsFieldsProps) {
  return (
    <>
      {variables.map((variable) => (
        <Field key={variable.slug}>
          <FieldLabel htmlFor={`proposal-${variable.slug}`}>{variable.label}</FieldLabel>
          <Input
            id={`proposal-${variable.slug}`}
            value={values[variable.slug] ?? ''}
            disabled={disabled}
            onChange={(event) => onChange(variable.slug, event.target.value)}
          />
        </Field>
      ))}
      {bodyHas(body, isReinforcementModuleLine) ? (
        <ReinforcementFields values={values} disabled={disabled} onChange={onChange} />
      ) : null}
      {bodyHas(body, isDationModuleLine) ? (
        <DationFields values={values} disabled={disabled} onChange={onChange} />
      ) : null}
    </>
  )
}

type ReinforcementRow = { id: string; valor: string; vencimento: string }
type DationRow = { id: string; description: string }

let nextRowId = 0

function rowId(): string {
  nextRowId += 1
  return `terms-row-${nextRowId}`
}

function ReinforcementFields({
  values,
  disabled,
  onChange,
}: {
  values: Record<string, string>
  disabled: boolean
  onChange: (slug: string, value: string) => void
}) {
  const [rows, setRows] = useState<ReinforcementRow[]>(() => {
    let lastFilled = -1
    const next: ReinforcementRow[] = []

    for (let index = 0; index < MAX_REPEAT_ROWS; index += 1) {
      const valor = values[reinforcementSlug(index, 'valor')] ?? ''
      const vencimento = values[reinforcementSlug(index, 'vencimento')] ?? ''
      next.push({ id: rowId(), valor, vencimento })
      if (valor.trim() !== '' || vencimento.trim() !== '') {
        lastFilled = index
      }
    }

    return next.slice(0, Math.max(1, lastFilled + 1))
  })

  function updateRow(id: string, field: 'valor' | 'vencimento', value: string) {
    const index = rows.findIndex((row) => row.id === id)
    if (index < 0) {
      return
    }

    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
    onChange(reinforcementSlug(index, field), value)
  }

  function addRow() {
    setRows((current) => (
      current.length >= MAX_REPEAT_ROWS
        ? current
        : [...current, { id: rowId(), valor: '', vencimento: '' }]
    ))
  }

  function removeRow(id: string) {
    const next = rows.filter((row) => row.id !== id)
    const compacted = next.length > 0 ? next : [{ id: rowId(), valor: '', vencimento: '' }]
    setRows(compacted)
    compacted.forEach((row, index) => {
      onChange(reinforcementSlug(index, 'valor'), row.valor)
      onChange(reinforcementSlug(index, 'vencimento'), row.vencimento)
    })
    for (let index = compacted.length; index < rows.length; index += 1) {
      onChange(reinforcementSlug(index, 'valor'), '')
      onChange(reinforcementSlug(index, 'vencimento'), '')
    }
  }

  return (
    <Field>
      <FieldLabel>Reforços</FieldLabel>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor={`reforco-valor-${row.id}`}>Valor</FieldLabel>
              <Input
                id={`reforco-valor-${row.id}`}
                aria-label={`Valor do reforço ${index + 1}`}
                placeholder="0,00"
                inputMode="decimal"
                value={row.valor}
                disabled={disabled}
                onChange={(event) => updateRow(row.id, 'valor', event.target.value)}
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor={`reforco-venc-${row.id}`}>Vencimento</FieldLabel>
              <Input
                id={`reforco-venc-${row.id}`}
                aria-label={`Vencimento do reforço ${index + 1}`}
                placeholder="dd/mm/aaaa"
                value={row.vencimento}
                disabled={disabled}
                onChange={(event) => updateRow(row.id, 'vencimento', event.target.value)}
              />
            </Field>
            {rows.length > 1 ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remover reforço ${index + 1}`}
                disabled={disabled}
                onClick={() => removeRow(row.id)}
              >
                <XIcon />
              </Button>
            ) : null}
            {index === rows.length - 1 ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="Adicionar reforço"
                disabled={disabled || rows.length >= MAX_REPEAT_ROWS}
                onClick={addRow}
              >
                <PlusIcon />
              </Button>
            ) : (
              <span className="size-8 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </Field>
  )
}

function DationFields({
  values,
  disabled,
  onChange,
}: {
  values: Record<string, string>
  disabled: boolean
  onChange: (slug: string, value: string) => void
}) {
  const [rows, setRows] = useState<DationRow[]>(() => {
    let lastFilled = -1
    const next: DationRow[] = []

    for (let index = 0; index < MAX_REPEAT_ROWS; index += 1) {
      const description = values[dationSlug(index)] ?? ''
      next.push({ id: rowId(), description })
      if (description.trim() !== '') {
        lastFilled = index
      }
    }

    return next.slice(0, Math.max(1, lastFilled + 1))
  })

  function updateRow(id: string, description: string) {
    const index = rows.findIndex((row) => row.id === id)
    if (index < 0) {
      return
    }

    setRows((current) => current.map((row) => (row.id === id ? { ...row, description } : row)))
    onChange(dationSlug(index), description)
  }

  function addRow() {
    setRows((current) => (
      current.length >= MAX_REPEAT_ROWS
        ? current
        : [...current, { id: rowId(), description: '' }]
    ))
  }

  function removeRow(id: string) {
    const next = rows.filter((row) => row.id !== id)
    const compacted = next.length > 0 ? next : [{ id: rowId(), description: '' }]
    setRows(compacted)
    compacted.forEach((row, index) => {
      onChange(dationSlug(index), row.description)
    })
    for (let index = compacted.length; index < rows.length; index += 1) {
      onChange(dationSlug(index), '')
    }
  }

  return (
    <Field>
      <FieldLabel>Dações</FieldLabel>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor={`dacao-${row.id}`}>Dação {index + 1}</FieldLabel>
              <Input
                id={`dacao-${row.id}`}
                aria-label={`Dação ${index + 1}`}
                placeholder="Descreva a dação"
                value={row.description}
                disabled={disabled}
                onChange={(event) => updateRow(row.id, event.target.value)}
              />
            </Field>
            {rows.length > 1 ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remover dação ${index + 1}`}
                disabled={disabled}
                onClick={() => removeRow(row.id)}
              >
                <XIcon />
              </Button>
            ) : null}
            {index === rows.length - 1 ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="Adicionar dação"
                disabled={disabled || rows.length >= MAX_REPEAT_ROWS}
                onClick={addRow}
              >
                <PlusIcon />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </Field>
  )
}
