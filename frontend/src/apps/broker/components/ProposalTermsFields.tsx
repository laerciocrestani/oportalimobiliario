import { useState } from 'react'
import { CalendarIcon, CalendarPlusIcon, HandshakeIcon, InfoIcon, PlusIcon, XIcon } from 'lucide-react'
import { ProposalSectionTitle } from '@/apps/broker/components/ProposalSectionTitle'
import {
  dationSlug,
  isDationModuleLine,
  isReinforcementModuleLine,
  MAX_REPEAT_ROWS,
  reinforcementSlug,
} from '@/apps/broker/lib/fill-proposal-template'
import { brazilianDateToIso, dateToBrazilian, maskBrazilianDate } from '@/lib/br-date'
import { maskBrazilianCurrency } from '@/lib/br-currency'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ptBR } from 'react-day-picker/locale'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { BrokerProposalVariable } from '@/lib/api'

type ProposalTermsFieldsProps = {
  body: string
  variables: BrokerProposalVariable[]
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
  const showReinforcements = bodyHas(body, isReinforcementModuleLine)
  const showDations = bodyHas(body, isDationModuleLine)

  return (
    <>
      {variables.map((variable) => (
        <Field key={variable.slug}>
          <div className="flex items-center gap-1.5">
            <FieldLabel htmlFor={`proposal-${variable.slug}`}>
              {variable.required ? `${variable.label} *` : variable.label}
            </FieldLabel>
            {variable.multiline && variable.placeholder ? (
              <ExampleHint text={variable.placeholder} />
            ) : null}
          </div>
          {variable.multiline ? (
            <Textarea
              id={`proposal-${variable.slug}`}
              className="min-h-28"
              value={values[variable.slug] ?? ''}
              disabled={disabled}
              onChange={(event) => onChange(variable.slug, event.target.value)}
            />
          ) : (
            <Input
              id={`proposal-${variable.slug}`}
              value={values[variable.slug] ?? ''}
              disabled={disabled}
              onChange={(event) => onChange(variable.slug, event.target.value)}
            />
          )}
        </Field>
      ))}
      {variables.length > 0 && (showReinforcements || showDations) ? <Separator /> : null}
      {showReinforcements ? (
        <ReinforcementFields values={values} disabled={disabled} onChange={onChange} />
      ) : null}
      {showReinforcements && showDations ? <Separator /> : null}
      {showDations ? (
        <DationFields values={values} disabled={disabled} onChange={onChange} />
      ) : null}
    </>
  )
}

function selectedDueDate(value: string): Date | undefined {
  const iso = brazilianDateToIso(value)

  if (iso === '') {
    return undefined
  }

  const [year, month, day] = iso.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function DueDateField({
  id,
  index,
  value,
  disabled,
  onChange,
}: {
  id: string
  index: number
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = selectedDueDate(value)
  const [month, setMonth] = useState<Date | undefined>(selected)

  return (
    <Field className="flex-1">
      <FieldLabel htmlFor={id}>Vencimento</FieldLabel>
      <InputGroup className="bg-background">
        <InputGroupInput
          id={id}
          aria-label={`Vencimento do reforço ${index + 1}`}
          className="h-full bg-transparent!"
          placeholder="10/10/2026"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(maskBrazilianDate(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && !disabled) {
              event.preventDefault()
              setMonth(selected ?? new Date())
              setOpen(true)
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <Popover
            open={open}
            onOpenChange={(next) => {
              setOpen(next)
              if (next) {
                setMonth(selected ?? new Date())
              }
            }}
          >
            <PopoverTrigger
              render={
                <InputGroupButton
                  aria-label={`Abrir calendário do vencimento ${index + 1}`}
                  size="icon-xs"
                  variant="ghost"
                  disabled={disabled}
                />
              }
            >
              <CalendarIcon />
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="end" sideOffset={8}>
              <Calendar
                mode="single"
                locale={ptBR}
                selected={selected}
                month={month}
                onMonthChange={setMonth}
                onSelect={(date) => {
                  if (!date) {
                    return
                  }

                  onChange(dateToBrazilian(date))
                  setOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

function ExampleHint({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="Ver exemplo"
              className="text-muted-foreground"
            />
          }
        >
          <InfoIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-line text-left">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
      const valor = maskBrazilianCurrency(values[reinforcementSlug(index, 'valor')] ?? '')
      const vencimento = maskBrazilianDate(values[reinforcementSlug(index, 'vencimento')] ?? '')
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
      <ProposalSectionTitle icon={CalendarPlusIcon}>Reforços</ProposalSectionTitle>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor={`reforco-valor-${row.id}`}>Valor</FieldLabel>
              <Input
                id={`reforco-valor-${row.id}`}
                aria-label={`Valor do reforço ${index + 1}`}
                placeholder="R$ 0,00"
                inputMode="numeric"
                value={row.valor}
                disabled={disabled}
                onChange={(event) => updateRow(row.id, 'valor', maskBrazilianCurrency(event.target.value))}
              />
            </Field>
            <DueDateField
              id={`reforco-venc-${row.id}`}
              index={index}
              value={row.vencimento}
              disabled={disabled}
              onChange={(value) => updateRow(row.id, 'vencimento', value)}
            />
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
      <ProposalSectionTitle icon={HandshakeIcon}>Dações</ProposalSectionTitle>
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
