import { useEffect, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { adminApi, type Tenant, type TenantBuilderUser } from '@/lib/api'

type TenantImpersonateDialogProps = {
  tenant: Tenant | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TenantImpersonateDialog({ tenant, open, onOpenChange }: TenantImpersonateDialogProps) {
  const [users, setUsers] = useState<TenantBuilderUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !tenant) {
      return
    }

    async function loadUsers() {
      setLoadingUsers(true)
      setError(null)
      setSelectedUserId('')

      try {
        const members = await adminApi.listTenantUsers(tenant.id)
        setUsers(members)
        if (members.length === 1) {
          setSelectedUserId(String(members[0].id))
        }
      } catch {
        setError('Não foi possível carregar a equipe desta construtora.')
        setUsers([])
      } finally {
        setLoadingUsers(false)
      }
    }

    void loadUsers()
  }, [open, tenant])

  async function handleConfirm() {
    if (!tenant || !selectedUserId) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await adminApi.impersonateTenant(tenant.id, Number(selectedUserId))
      window.open(result.redirect_url, '_blank', 'noopener,noreferrer')
      onOpenChange(false)
    } catch {
      setError('Não foi possível iniciar o acesso. Verifique se a construtora está ativa.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acessar como construtora</DialogTitle>
          <DialogDescription>
            {tenant
              ? `Escolha um usuário da equipe de ${tenant.name} para abrir o portal construtora em uma nova aba.`
              : 'Selecione um usuário para continuar.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        {loadingUsers ? <p className="text-sm text-muted-foreground">Carregando equipe...</p> : null}

        {!loadingUsers && users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta construtora ainda não possui usuários builder. Crie a equipe pelo portal construtora
            antes de simular o login.
          </p>
        ) : null}

        {!loadingUsers && users.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="impersonate-user">Usuário</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="impersonate-user" className="w-full">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button
            onClick={() => void handleConfirm()}
            disabled={submitting || !selectedUserId || users.length === 0}
          >
            {submitting ? 'Abrindo...' : 'Acessar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
