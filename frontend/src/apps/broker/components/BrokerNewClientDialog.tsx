import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { brokerApi, type BrokerClient } from '@/lib/api'

type BrokerNewClientDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (client: BrokerClient) => void
}

export function BrokerNewClientDialog({
  open,
  onOpenChange,
  onCreated,
}: BrokerNewClientDialogProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setName('')
    setPhone('')
    setEmail('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const client = await brokerApi.createClient({
        name,
        phone,
        email: email || undefined,
      })
      resetForm()
      onCreated(client)
      onOpenChange(false)
    } catch {
      setError('Não foi possível cadastrar o cliente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Cadastre o cliente e vincule à reserva.</DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <DialogBody>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-client-name">Nome *</Label>
            <Input
              id="new-client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-client-phone">Telefone *</Label>
            <Input
              id="new-client-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-client-email">E-mail</Label>
            <Input
              id="new-client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </DialogBody>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              Salvar cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
