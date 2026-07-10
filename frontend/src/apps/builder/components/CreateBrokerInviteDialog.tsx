import { useState } from 'react'
import {
  HandshakeIcon,
  Link2Icon,
  MailIcon,
  MessageCircleIcon,
  SendIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { builderApi, type BrokerInvite, type CreateBrokerInviteInput } from '@/lib/api'
import {
  formatBrazilianMobilePhone,
  isBrazilianMobilePhoneValid,
  isValidEmail,
} from '@/lib/format-phone'

const channelOptions = ['whatsapp', 'link', 'email'] as const satisfies readonly BrokerInvite['channel'][]

const channelLabels: Record<BrokerInvite['channel'], string> = {
  whatsapp: 'WhatsApp',
  link: 'Link',
  email: 'E-mail',
}

const channelIcons = {
  whatsapp: MessageCircleIcon,
  link: Link2Icon,
  email: MailIcon,
} as const

const channelHelpers: Record<BrokerInvite['channel'], string> = {
  whatsapp:
    'O convite será enviado automaticamente por WhatsApp para o número informado. O corretor receberá uma mensagem com o link para aceitar o convite e criar a conta. Se ainda não tiver e-mail cadastrado, ele informará no momento do aceite.',
  link: 'Nenhuma mensagem é enviada automaticamente. Ao criar o convite, você receberá um link exclusivo para copiar e compartilhar manualmente com o corretor — por WhatsApp, e-mail ou outro canal de sua preferência.',
  email:
    'O convite será enviado automaticamente para o e-mail informado, com um link para o corretor aceitar o convite, definir a senha e acessar o painel de corretor.',
}

type CreateBrokerInviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (invite: BrokerInvite) => void
}

export function CreateBrokerInviteDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBrokerInviteDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState<BrokerInvite['channel']>('whatsapp')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setEmail('')
    setPhone('')
    setChannel('whatsapp')
    setError(null)
    setPhoneError(null)
    setEmailError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm()
    }

    onOpenChange(nextOpen)
  }

  function handleChannelChange(nextChannel: BrokerInvite['channel']) {
    setChannel(nextChannel)
    setError(null)
    setPhoneError(null)
    setEmailError(null)
  }

  function validateForm(): boolean {
    setPhoneError(null)
    setEmailError(null)

    if (channel === 'whatsapp' && !isBrazilianMobilePhoneValid(phone)) {
      setPhoneError('Informe um celular válido com DDD e 9 dígitos, ex.: (11) 99999-9999.')
      return false
    }

    if (channel === 'email' && !isValidEmail(email)) {
      setEmailError('Informe um e-mail válido.')
      return false
    }

    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    const payload: CreateBrokerInviteInput = {
      name,
      channel,
      email: channel === 'email' ? email.trim() : undefined,
      phone: channel === 'whatsapp' ? phone : undefined,
    }

    try {
      const invite = await builderApi.createInvite(payload)
      onCreated(invite)
      handleOpenChange(false)
    } catch {
      setError('Não foi possível enviar o convite.')
    } finally {
      setSubmitting(false)
    }
  }

  const SubmitIcon = channel === 'link' ? Link2Icon : SendIcon

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandshakeIcon className="size-5" />
            Convidar corretor
          </DialogTitle>
          <DialogDescription>
            Informe os dados do corretor e escolha como enviar o convite.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Nome</Label>
            <Input
              id="invite-name"
              placeholder="Nome do corretor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Canal de envio</Label>
            <div className="flex flex-wrap gap-2">
              {channelOptions.map((option) => {
                const Icon = channelIcons[option]

                return (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={channel === option ? 'default' : 'outline'}
                    onClick={() => handleChannelChange(option)}
                  >
                    <Icon />
                    {channelLabels[option]}
                  </Button>
                )
              })}
            </div>
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
              {channelHelpers[channel]}
            </p>
          </div>

          {channel === 'whatsapp' ? (
            <div className="space-y-2">
              <Label htmlFor="invite-phone">Telefone (WhatsApp)</Label>
              <Input
                id="invite-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => {
                  setPhone(formatBrazilianMobilePhone(e.target.value))
                  setPhoneError(null)
                }}
                aria-invalid={phoneError ? true : undefined}
                required
              />
              {phoneError ? <p className="text-sm text-destructive">{phoneError}</p> : null}
            </div>
          ) : null}

          {channel === 'email' ? (
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="E-mail do corretor"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailError(null)
                }}
                aria-invalid={emailError ? true : undefined}
                required
              />
              {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              <SubmitIcon />
              {submitting
                ? 'Enviando...'
                : channel === 'link'
                  ? 'Criar convite'
                  : 'Enviar convite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
