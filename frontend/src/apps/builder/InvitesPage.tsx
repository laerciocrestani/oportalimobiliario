import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  Funnel,
  Link2Icon,
  Plus,
  RefreshCwIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { CreateBrokerInviteDialog } from '@/apps/builder/components/CreateBrokerInviteDialog'
import { InviteFiltersDialog } from '@/apps/builder/components/InviteFiltersDialog'
import { InviteLinkDialog } from '@/apps/builder/components/InviteLinkDialog'
import { PendingBrokersSection } from '@/apps/builder/components/PendingBrokersSection'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { builderApi, type BrokerInvite, type PendingBroker, type TenantInviteLink } from '@/lib/api'
import { formatRelativeTimePtBr, formatShortDate } from '@/lib/format-relative-time'

type InviteDisplayStatus = BrokerInvite['status']

const statusConfig: Record<InviteDisplayStatus, { label: string; Icon: LucideIcon }> = {
  pending: { label: 'Pendente', Icon: ClockIcon },
  accepted: { label: 'Aceito', Icon: CircleCheckIcon },
  declined: { label: 'Recusado', Icon: CircleXIcon },
  expired: { label: 'Expirado', Icon: ClockIcon },
  revoked: { label: 'Revogado', Icon: CircleXIcon },
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

function displayStatus(status: BrokerInvite['status']): InviteDisplayStatus {
  return status
}

function isInviteOpen(status: BrokerInvite['status']): boolean {
  return status === 'pending' || status === 'expired'
}

function InviteStatusBadge({ status }: { status: BrokerInvite['status'] }) {
  const { label, Icon } = statusConfig[status]
  const variant =
    status === 'accepted'
      ? 'default'
      : status === 'declined' || status === 'revoked' || status === 'expired'
        ? 'destructive'
        : 'outline'

  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {label}
    </Badge>
  )
}

function InviteExpiredBadge({
  expiresAt,
  onResend,
}: {
  expiresAt: string
  onResend: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Badge variant="destructive" className="cursor-default" />}
      >
        Expirado
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="flex flex-col items-start gap-2 px-3 py-2 text-left"
      >
        <span>Expirado em {formatShortDate(expiresAt)}</span>
        <Button
          type="button"
          size="xs"
          variant="secondary"
          className="h-7 bg-background/15 text-background hover:bg-background/25"
          onClick={() => void onResend()}
        >
          <RefreshCwIcon />
          Reenviar
        </Button>
      </TooltipContent>
    </Tooltip>
  )
}

function InviteSentAt({ sentAt }: { sentAt: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm whitespace-nowrap">{formatRelativeTimePtBr(sentAt)}</span>
      <Badge
        variant="outline"
        className="h-auto px-1.5 py-0 text-[0.65rem] font-normal text-muted-foreground"
      >
        {formatShortDate(sentAt)}
      </Badge>
    </div>
  )
}

function InviteActionsMenu({
  invite,
  onCopyLink,
  onResend,
  onRevoke,
  onReactivate,
}: {
  invite: BrokerInvite
  onCopyLink: (url: string) => void
  onResend: (id: number) => void
  onRevoke: (id: number) => void
  onReactivate: (id: number) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground data-open:bg-muted"
            aria-label={`Ações — ${invite.name}`}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onCopyLink(invite.invite_url)}>
          <CopyIcon />
          Copiar link
        </DropdownMenuItem>
        {isInviteOpen(invite.status) ? (
          <>
            <DropdownMenuItem onClick={() => void onResend(invite.id)}>
              <RefreshCwIcon />
              Reenviar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void onRevoke(invite.id)}>
              <XIcon />
              Revogar
            </DropdownMenuItem>
          </>
        ) : null}
        {invite.status === 'revoked' ? (
          <DropdownMenuItem onClick={() => void onReactivate(invite.id)}>
            <RefreshCwIcon />
            Reativar
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function matchesInviteSearch(invite: BrokerInvite, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  if (normalizedQuery === '') {
    return true
  }

  if (invite.name.toLowerCase().includes(normalizedQuery)) {
    return true
  }

  if (invite.email?.toLowerCase().includes(normalizedQuery)) {
    return true
  }

  if (invite.phone === null) {
    return false
  }

  const digitQuery = normalizedQuery.replace(/\D/g, '')

  if (digitQuery !== '' && invite.phone.replace(/\D/g, '').includes(digitQuery)) {
    return true
  }

  return invite.phone.toLowerCase().includes(normalizedQuery)
}

function matchesInviteFilters(
  invite: BrokerInvite,
  search: string,
  statusFilter: BrokerInvite['status'] | '',
  channelFilter: BrokerInvite['channel'] | '',
): boolean {
  if (statusFilter !== '') {
    if (statusFilter === 'pending') {
      if (invite.status !== 'pending' && invite.status !== 'expired') {
        return false
      }
    } else if (invite.status !== statusFilter) {
      return false
    }
  }

  if (channelFilter !== '' && invite.channel !== channelFilter) {
    return false
  }

  return matchesInviteSearch(invite, search)
}

export function InvitesPage() {
  const { can, permissions, loading: permissionsLoading } = useBuilderPermissions()
  const [invites, setInvites] = useState<BrokerInvite[]>([])
  const [inviteLink, setInviteLink] = useState<TenantInviteLink | null>(null)
  const [pendingBrokers, setPendingBrokers] = useState<PendingBroker[]>([])
  const [inviteLinkLoading, setInviteLinkLoading] = useState(true)
  const [inviteLinkError, setInviteLinkError] = useState(false)
  const [pendingLoading, setPendingLoading] = useState(true)
  const [regeneratingLink, setRegeneratingLink] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BrokerInvite['status'] | ''>('')
  const [channelFilter, setChannelFilter] = useState<BrokerInvite['channel'] | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteLinkDialogOpen, setInviteLinkDialogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const filteredInvites = useMemo(
    () =>
      invites.filter((invite) => matchesInviteFilters(invite, search, statusFilter, channelFilter)),
    [invites, search, statusFilter, channelFilter],
  )

  const hasActiveFilters =
    search.trim() !== '' || statusFilter !== '' || channelFilter !== ''

  const hasModalFilters = statusFilter !== '' || channelFilter !== ''

  async function loadInviteLink() {
    setInviteLinkError(false)
    setInviteLink(await builderApi.getInviteLink())
  }

  async function retryInviteLink() {
    setInviteLinkLoading(true)
    setInviteLinkError(false)

    try {
      await loadInviteLink()
    } catch {
      setInviteLinkError(true)
      toast.error('Não foi possível carregar o link de convite.')
    } finally {
      setInviteLinkLoading(false)
    }
  }

  async function loadPendingBrokers() {
    setPendingBrokers(await builderApi.listPendingBrokers())
  }

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

    if (!permissions.includes('invites.send')) {
      setLoading(false)
      setInviteLinkLoading(false)
      setPendingLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setInviteLinkLoading(true)
      setPendingLoading(true)

      const [invitesResult, inviteLinkResult, pendingResult] = await Promise.allSettled([
        loadInvites(),
        loadInviteLink(),
        loadPendingBrokers(),
      ])

      setLoading(false)
      setInviteLinkLoading(false)
      setPendingLoading(false)

      setInviteLinkError(inviteLinkResult.status === 'rejected')

      if (invitesResult.status === 'rejected') {
        toast.error('Não foi possível carregar os convites.')
      }

      if (inviteLinkResult.status === 'rejected') {
        toast.error('Não foi possível carregar o link de convite.')
      }

      if (pendingResult.status === 'rejected') {
        toast.error('Não foi possível carregar as solicitações pendentes.')
      }
    }

    void load()
  }, [permissionsLoading, permissions.join(',')])

  function handleInviteCreated() {
    toast.success('Convite enviado.')
    void loadInvites()
  }

  async function handleRegenerateLink() {
    setRegeneratingLink(true)

    try {
      setInviteLink(await builderApi.regenerateInviteLink())
      toast.success('Link regenerado. Links anteriores deixam de funcionar.')
    } catch {
      toast.error('Não foi possível regenerar o link.')
    } finally {
      setRegeneratingLink(false)
    }
  }

  async function handleApprovePending(id: number) {
    try {
      await builderApi.approvePendingBroker(id)
      toast.success('Corretor aprovado.')
      await Promise.all([loadPendingBrokers(), loadInvites()])
    } catch {
      toast.error('Não foi possível aprovar o corretor.')
    }
  }

  async function handleRejectPending(id: number) {
    try {
      await builderApi.rejectPendingBroker(id)
      toast.success('Solicitação recusada.')
      await loadPendingBrokers()
    } catch {
      toast.error('Não foi possível recusar a solicitação.')
    }
  }

  function handleClearFilters() {
    setStatusFilter('')
    setChannelFilter('')
  }

  async function handleCopyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado para a área de transferência.')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  async function handleResend(id: number) {
    try {
      await builderApi.resendInvite(id)
      toast.success('Convite reenviado.')
      await loadInvites()
    } catch {
      toast.error('Não foi possível reenviar o convite.')
    }
  }

  async function handleRevoke(id: number) {
    try {
      await builderApi.revokeInvite(id)
      toast.success('Convite revogado.')
      await loadInvites()
    } catch {
      toast.error('Não foi possível revogar o convite.')
    }
  }

  async function handleReactivateInvite(id: number) {
    try {
      await builderApi.reactivateInvite(id)
      toast.success('Convite reativado.')
      await loadInvites()
    } catch {
      toast.error('Não foi possível reativar o convite.')
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
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Buscar convites"
            className="min-w-0 flex-1 sm:max-w-md"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex items-center gap-1 sm:ml-auto">
          <Button
              type="button"
              variant="outline"
              onClick={() => setInviteLinkDialogOpen(true)}
            >
              <Link2Icon />
              Link de convite
            </Button>
            <Button
              size="icon"
              variant={hasModalFilters ? 'default' : 'outline'}
              aria-label="Filtros"
              onClick={() => setFiltersOpen(true)}
            >
              <Funnel />
            </Button>
            
            <Button
              size="icon"
              aria-label="Convidar corretor"
              onClick={() => setDialogOpen(true)}
            >
              <Plus />
            </Button>
          </div>
        </div>

        <PendingBrokersSection
          pendingBrokers={pendingBrokers}
          loading={pendingLoading}
          onApprove={(id) => void handleApprovePending(id)}
          onReject={(id) => void handleRejectPending(id)}
        />

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando convites...</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite enviado ainda.</p>
        ) : filteredInvites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'Nenhum convite encontrado com os filtros selecionados.'
              : 'Nenhum convite encontrado.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.name}</TableCell>
                  <TableCell>{invite.email ?? invite.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{channelLabels[invite.channel]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <InviteStatusBadge status={invite.status} />
                      {invite.status === 'expired' ? (
                        <InviteExpiredBadge
                          expiresAt={invite.expires_at}
                          onResend={() => void handleResend(invite.id)}
                        />
                      ) : null}
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
                    <InviteSentAt sentAt={invite.last_sent_at} />
                  </TableCell>
                  <TableCell className="text-right">
                    <InviteActionsMenu
                      invite={invite}
                      onCopyLink={(url) => void handleCopyLink(url)}
                      onResend={handleResend}
                      onRevoke={handleRevoke}
                      onReactivate={handleReactivateInvite}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <InviteFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        statusFilter={statusFilter}
        channelFilter={channelFilter}
        onStatusFilterChange={setStatusFilter}
        onChannelFilterChange={setChannelFilter}
        onClear={handleClearFilters}
      />

      <InviteLinkDialog
        open={inviteLinkDialogOpen}
        onOpenChange={setInviteLinkDialogOpen}
        inviteLink={inviteLink}
        loading={inviteLinkLoading}
        error={inviteLinkError}
        regenerating={regeneratingLink}
        onCopy={(url) => void handleCopyLink(url)}
        onRegenerate={() => void handleRegenerateLink()}
        onRetry={() => void retryInviteLink()}
      />

      <CreateBrokerInviteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleInviteCreated}
      />
    </BuilderDashboardShell>
  )
}
