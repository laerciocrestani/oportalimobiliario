import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WhatsAppPhoneInput } from '@/components/whatsapp-phone-input'

function PhoneField() {
  const [value, setValue] = useState('')

  return (
    <div>
      <label htmlFor="phone">Telefone</label>
      <WhatsAppPhoneInput id="phone" value={value} onChange={setValue} />
    </div>
  )
}

describe('WhatsAppPhoneInput', () => {
  it('masks digits as brazilian mobile and shows the whatsapp icon', async () => {
    const user = userEvent.setup()

    render(<PhoneField />)

    const phoneInput = screen.getByLabelText('Telefone')

    expect(phoneInput.closest('[data-slot="input-group"]')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()

    await user.type(phoneInput, '11988887777')

    expect(phoneInput).toHaveValue('(11) 98888-7777')
  })
})
