import { MessageCircleIcon } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { formatBrazilianMobilePhone } from '@/lib/format-phone'

type WhatsAppPhoneInputProps = {
  id: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

export function WhatsAppPhoneInput({
  id,
  value,
  onChange,
  required,
  disabled,
  placeholder = '(11) 99999-9999',
}: WhatsAppPhoneInputProps) {
  return (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <MessageCircleIcon aria-hidden="true" />
        <span className="sr-only">WhatsApp</span>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={placeholder}
        value={formatBrazilianMobilePhone(value)}
        onChange={(e) => onChange(formatBrazilianMobilePhone(e.target.value))}
        required={required}
        disabled={disabled}
      />
    </InputGroup>
  )
}
