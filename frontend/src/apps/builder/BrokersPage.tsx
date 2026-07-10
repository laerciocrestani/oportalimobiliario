import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  EllipsisVerticalIcon,
  RotateCcwIcon,
  ShieldOffIcon,
  Trash2Icon,
} from 'lucide-react'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { BrokerAccessDialog } from '@/apps/builder/components/BrokerAccessDialog'
import { RemoveBrokerDialog } from '@/apps/builder/components/RemoveBrokerDialog'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { builderApi, type LinkedBroker } from '@/lib/api'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

export function BrokersPage() {
  const { can, permissions, loading: permissionsLoading } = useBuilderPermissions()
  const [brokers, setBrokers] = useState<LinkedBroker[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBroker, setSelectedBroker] = useState<LinkedBroker | null>(null)
  const [accessDialogOpen, setAccessDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function loadBrokers() {
    setBrokers(await builderApi.listBrokers())
  }

  useEffect(() => {
    if (permissionsLoading) {
      return
    }

    if (!permissions.includes('access.manage')) {
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        await loadBrokers()
      } catch {
        setError('Não foi possível carregar os corretores.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [permissionsLoading, permissions.join(',')])

  function handleOpenAccess(broker: LinkedBroker) {
    setSelectedBroker(broker)
    setAccessDialogOpen(true)
  }

  function handleOpenRemove(broker: LinkedBroker) {
    setSelectedBroker(broker)
    setRemoveDialogOpen(true)
  }

  async function handleAccessUpdated() {
    await loadBrokers()
  }

  async function handleDeactivate(broker: LinkedBroker) {
    try {
      await builderApi.deactivateBroker(broker.id)
      toast.success(`${broker.name} inativado.`)
      await loadBrokers()
    } catch {
      toast.error('Não foi possível inativar o corretor.')
    }
  }

  async function handleReactivate(broker: LinkedBroker) {
    try {
      await builderApi.reactivateBroker(broker.id)
      toast.success(`${broker.name} reativado.`)
      await loadBrokers()
    } catch {
      toast.error('Não foi possível reativar o corretor.')
    }
  }

  async function handleRemoveConfirm() {
    if (selectedBroker === null) {
      return
    }

    setRemoving(true)

    try {
      await builderApi.removeBroker(selectedBroker.id)
      toast.success('Vínculo removido.')
      setRemoveDialogOpen(false)
      setSelectedBroker(null)
      await loadBrokers()
    } catch {
      toast.error('Não foi possível remover o corretor.')
    } finally {
      setRemoving(false)
    }
  }

  if (!can('access.manage')) {
    return (
      <BuilderDashboardShell title="Corretores">
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para visualizar corretores.
        </p>
      </BuilderDashboardShell>
    )
  }

  const activeBrokers = brokers.filter((broker) => broker.status === 'active')
  const totalBuildings = activeBrokers.reduce((sum, broker) => sum + broker.buildings_count, 0)

  return (
    <BuilderDashboardShell title="Corretores">
      <div className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Corretores vinculados</CardDescription>
              <CardTitle className="text-3xl">{brokers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ativos</CardDescription>
              <CardTitle className="text-3xl">{activeBrokers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Acessos concedidos (ativos)</CardDescription>
              <CardTitle className="text-3xl">{totalBuildings}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Corretores</CardTitle>
            <CardDescription>
              Corretores vinculados à construtora. Inativos permanecem na lista, mas perdem acesso
              ao portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando corretores...</p>
            ) : brokers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum corretor vinculado ainda. Envie convites para começar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Empreendimentos</TableHead>
                    <TableHead>Vinculado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokers.map((broker) => (
                    <TableRow key={broker.id}>
                      <TableCell className="font-medium">{broker.name}</TableCell>
                      <TableCell>{broker.email ?? broker.phone ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={broker.status === 'active' ? 'default' : 'secondary'}>
                          {broker.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {broker.buildings_count}{' '}
                            {broker.buildings_count === 1 ? 'empreendimento' : 'empreendimentos'}
                          </p>
                          {broker.buildings.length > 0 ? (
                            <div className="flex max-w-md flex-wrap gap-1">
                              {broker.buildings.map((building) => (
                                <Badge key={building.id} variant="secondary">
                                  {building.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhum liberado</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(broker.accepted_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground"
                                aria-label={`Ações — ${broker.name}`}
                              />
                            }
                          >
                            <EllipsisVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {broker.status === 'active' ? (
                              <>
                                <DropdownMenuItem onClick={() => handleOpenAccess(broker)}>
                                  Gerenciar acesso
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void handleDeactivate(broker)}>
                                  <ShieldOffIcon />
                                  Inativar
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem onClick={() => void handleReactivate(broker)}>
                                <RotateCcwIcon />
                                Reativar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleOpenRemove(broker)}
                            >
                              <Trash2Icon />
                              Remover vínculo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <BrokerAccessDialog
        broker={selectedBroker}
        open={accessDialogOpen}
        onOpenChange={setAccessDialogOpen}
        onUpdated={handleAccessUpdated}
      />

      <RemoveBrokerDialog
        broker={selectedBroker}
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        onConfirm={() => void handleRemoveConfirm()}
        submitting={removing}
      />
    </BuilderDashboardShell>
  )
}
