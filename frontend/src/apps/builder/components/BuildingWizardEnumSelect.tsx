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
  value: string
  emptyLabel: string
  options: ReadonlyArray<{ value: string; label: string }>
  onChange: (value: string) => void
}

export function BuildingWizardEnumSelect({
  id,
  label,
  value,
  emptyLabel,
  options,
  onChange,
}: BuildingWizardEnumSelectProps) {
  const selected = value === '' ? emptyLabel : (optionLabel(options, value) ?? emptyLabel)

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
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
