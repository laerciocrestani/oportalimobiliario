import type { LucideIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { optionLabel } from '@/apps/builder/lib/unit-spec'

const EMPTY_VALUE = 'unset'

type BuildingWizardEnumSelectProps = {
  id: string
  label: string
  icon?: LucideIcon
  value: string
  emptyLabel: string
  options: ReadonlyArray<{ value: string; label: string }>
  onChange: (value: string) => void
}

export function BuildingWizardEnumSelect({
  id,
  label,
  icon: Icon,
  value,
  emptyLabel,
  options,
  onChange,
}: BuildingWizardEnumSelectProps) {
  const selected = value === '' ? emptyLabel : (optionLabel(options, value) ?? emptyLabel)

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 text-muted-foreground" aria-hidden /> : null}
        {label}
      </Label>
      <Select
        value={value === '' ? EMPTY_VALUE : value}
        onValueChange={(next) => {
          if (next === null) {
            return
          }

          onChange(next === EMPTY_VALUE ? '' : next)
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={emptyLabel}>{selected}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={EMPTY_VALUE}>{emptyLabel}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
