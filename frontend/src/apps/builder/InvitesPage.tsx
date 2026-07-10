import { useEffect, useState } from 'react'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { CreateBrokerInviteDialog } from '@/apps/builder/components/CreateBrokerInviteDialog'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { builderApi, type BrokerInvite } from '@/lib/api'

const statusLabels: Record<BrokerInvite['status'], string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  expired: 'Expirado',
}

const channelLabels: Record<BrokerInvite['channel'], string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  link: 'Link',
}

const deliveryStatusLabels: Record<NonNullable<BrokerInvite['delivery_status']>, string> = {
  pending: 'Enviando',
  sent: 'Enviado',
  delivered: 'Entregue',
  failed: 'Falhou',
}

function InviteStatusBadge({ status }: { status: BrokerInvite['status'] }) {
  const variant =
    status === 'accepted' ? 'default' : status === 'expired' ? 'secondary' : 'outline'

  return <Badge variant={variant}>{statusLabels[status]}</Badge>
}

export function InvitesPage() {
  const { can, permissions, loading: permissionsLoading } = useBuilderPermissions()
  const [invites, setInvites] = useState<BrokerInvite[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadInvites() {
    if (!permissions.includes('invites.send')) {
      return
    }

    setInvites(await builderApi.listInvites())
  }

  useEffect(() => {
    if (permissionsLoading) {
      return
    }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        await loadInvites()
      } catch {
        setError('Não foi possível carregar os convites.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [permissionsLoading, permissions.join(',')])

  function handleInviteCreated(invite: BrokerInvite) {
    setMessage(
      invite.channel === 'link'
        ? `Convite criado para ${invite.name}. Copie o link para enviar manualmente.`
        : `Convite enviado para ${invite.name}.`,
    )
    void loadInvites()
  }

  async function handleCopyLink(url: string) {
    await navigator.clipboard.writeText(url)
    setMessage('Link copiado para a área de transferência.')
  }

  async function handleResend(id: number) {
    setError(null)
    try {
      await builderApi.resendInvite(id)
      setMessage('Convite reenviado.')
      await loadInvites()
    } catch {
      setError('Não foi possível reenviar o convite.')
    }
  }

  async function handleCancel(id: number) {
    setError(null)
    try {
      await builderApi.cancelInvite(id)
      setMessage('Convite cancelado.')
      await loadInvites()
    } catch {
      setError('Não foi possível cancelar o convite.')
    }
  }

  if (!can('invites.send')) {
    return (
      <BuilderDashboardShell title="Convites">
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para gerenciar convites.
        </p>
      </BuilderDashboardShell>
    )
  }

  return (
    <BuilderDashboardShell title="Convites">
      <div className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Convites enviados</CardTitle>
              <CardDescription>
                Acompanhe os convites pendentes, aceitos e expirados.
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>Convidar corretor</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando convites...</p>
            ) : invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum convite enviado ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.name}</TableCell>
                      <TableCell>{invite.email ?? invite.phone ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{channelLabels[invite.channel]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <InviteStatusBadge status={invite.status} />
                          {invite.delivery_status ? (
                            <Badge
                              variant={
                                invite.delivery_status === 'failed' ? 'destructive' : 'secondary'
                              }
                            >
                              {deliveryStatusLabels[invite.delivery_status]}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleCopyLink(invite.invite_url)}
                          >
                            Copiar link
                          </Button>
                          {invite.status === 'pending' ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void handleResend(invite.id)}
                              >
                                Reenviar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => void handleCancel(invite.id)}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateBrokerInviteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleInviteCreated}
      />
    </BuilderDashboardShell>
  )
}
