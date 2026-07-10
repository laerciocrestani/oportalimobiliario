import { useEffect, useState } from 'react'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { BrokerAccessDialog } from '@/apps/builder/components/BrokerAccessDialog'
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

  async function handleAccessUpdated() {
    await loadBrokers()
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

  const totalBuildings = brokers.reduce((sum, broker) => sum + broker.buildings_count, 0)

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
              <CardDescription>Acessos concedidos</CardDescription>
              <CardTitle className="text-3xl">{totalBuildings}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Média por corretor</CardDescription>
              <CardTitle className="text-3xl">
                {brokers.length > 0 ? (totalBuildings / brokers.length).toFixed(1) : '0'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Corretores</CardTitle>
            <CardDescription>
              Corretores que aceitaram convite e os empreendimentos liberados para cada um.
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
                    <TableHead>E-mail</TableHead>
                    <TableHead>Empreendimentos</TableHead>
                    <TableHead>Vinculado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokers.map((broker) => (
                    <TableRow key={broker.id}>
                      <TableCell className="font-medium">{broker.name}</TableCell>
                      <TableCell>{broker.email}</TableCell>
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAccess(broker)}
                        >
                          Gerenciar acesso
                        </Button>
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
    </BuilderDashboardShell>
  )
}
