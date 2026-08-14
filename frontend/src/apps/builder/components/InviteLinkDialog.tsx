import { CopyIcon, Link2Icon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { TenantInviteLink } from '@/lib/api'

type InviteLinkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  inviteLink: TenantInviteLink | null
  loading: boolean
  error: boolean
  regenerating: boolean
  onCopy: (url: string) => void
  onRegenerate: () => void
  onRetry: () => void
}

export function InviteLinkDialog({
  open,
  onOpenChange,
  inviteLink,
  loading,
  error,
  regenerating,
  onCopy,
  onRegenerate,
  onRetry,
}: InviteLinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2Icon className="size-5" />
            Link de convite para corretores
          </DialogTitle>
          <DialogDescription>
            Compartilhe este link em grupos de WhatsApp ou outros canais. Vários corretores podem se
            cadastrar; cada solicitação precisa da sua aprovação.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando link...</p>
          ) : inviteLink ? (
            <>
              <Input readOnly value={inviteLink.invite_url} aria-label="Link de convite" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => onCopy(inviteLink.invite_url)}>
                  <CopyIcon />
                  Copiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={regenerating}
                  onClick={onRegenerate}
                >
                  <RefreshCwIcon />
                  {regenerating ? 'Regenerando...' : 'Regenerar'}
                </Button>
              </div>
              {inviteLink.regenerated_at ? (
                <p className="text-xs text-muted-foreground">
                  Última regeneração: {new Date(inviteLink.regenerated_at).toLocaleString('pt-BR')}
                </p>
              ) : null}
            </>
          ) : error ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-destructive">Não foi possível carregar o link.</p>
              <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                Tentar novamente
              </Button>
            </div>
          ) : null}
        </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
