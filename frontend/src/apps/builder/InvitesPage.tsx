import { useEffect, useState } from 'react'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  builderApi,
  type BrokerInvite,
  type Building,
  type GrantedBuilding,
  type LinkedBroker,
} from '@/lib/api'

const statusLabels: Record<BrokerInvite['status'], string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  expired: 'Expirado',
}

function InviteStatusBadge({ status }: { status: BrokerInvite['status'] }) {
  const variant =
    status === 'accepted' ? 'default' : status === 'expired' ? 'secondary' : 'outline'

  return <Badge variant={variant}>{statusLabels[status]}</Badge>
}

export function InvitesPage() {
  const { can, permissions, loading: permissionsLoading } = useBuilderPermissions()
  const [invites, setInvites] = useState<BrokerInvite[]>([])
  const [brokers, setBrokers] = useState<LinkedBroker[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [grantedByBroker, setGrantedByBroker] = useState<Record<number, GrantedBuilding[]>>({})
  const [email, setEmail] = useState('')
  const [selectedBrokerId, setSelectedBrokerId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadInvites() {
    if (!permissions.includes('invites.send')) {
      return
    }

    setInvites(await builderApi.listInvites())
  }

  async function loadAccessData() {
    if (!permissions.includes('access.manage')) {
      return
    }

    const [linkedBrokers, allBuildings] = await Promise.all([
      builderApi.listBrokers(),
      builderApi.listBuildings(),
    ])

    setBrokers(linkedBrokers)
    setBuildings(allBuildings)

    const grantedEntries = await Promise.all(
      linkedBrokers.map(async (broker) => [
        broker.id,
        await builderApi.listBrokerBuildings(broker.id),
      ] as const),
    )

    setGrantedByBroker(Object.fromEntries(grantedEntries))
  }

  async function load() {
    setLoading(true)
    setError(null)

    const errors: string[] = []

    try {
      await loadInvites()
    } catch {
      errors.push('convites')
    }

    try {
      await loadAccessData()
    } catch {
      errors.push('acesso')
    }

    if (errors.length === 2) {
      setError('Não foi possível carregar os convites.')
    } else if (errors.length === 1) {
      setError(
        errors[0] === 'convites'
          ? 'Não foi possível carregar os convites.'
          : 'Não foi possível carregar os corretores vinculados.',
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    if (permissionsLoading) {
      return
    }

    void load()
  }, [permissionsLoading, permissions.join(',')])

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    try {
      const invite = await builderApi.createInvite(email)
      setEmail('')
      setMessage(`Convite enviado para ${invite.email}.`)
      await loadInvites()
    } catch {
      setError('Não foi possível enviar o convite.')
    }
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

  async function toggleBuildingAccess(brokerId: number, buildingId: number, granted: boolean) {
    setError(null)

    try {
      if (granted) {
        await builderApi.revokeBuildingAccess(brokerId, buildingId)
      } else {
        await builderApi.grantBuildingAccess(brokerId, buildingId)
      }

      setGrantedByBroker((current) => ({
        ...current,
        [brokerId]: granted
          ? (current[brokerId] ?? []).filter((item) => item.id !== buildingId)
          : [
              ...(current[brokerId] ?? []),
              {
                id: buildingId,
                name: buildings.find((b) => b.id === buildingId)?.name ?? '',
                granted_at: new Date().toISOString(),
              },
            ],
      }))
    } catch {
      setError('Não foi possível atualizar o acesso ao empreendimento.')
    }
  }

  const selectedBroker = brokers.find((broker) => broker.id === selectedBrokerId) ?? null
  const grantedBuildingIds = new Set(
    selectedBrokerId ? (grantedByBroker[selectedBrokerId] ?? []).map((b) => b.id) : [],
  )

  return (
    <BuilderDashboardShell title="Convites">
      <div className="space-y-8">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        {can('invites.send') ? (
          <Card>
            <CardHeader>
              <CardTitle>Convidar corretor</CardTitle>
              <CardDescription>
                Envie um convite por e-mail. O corretor poderá criar a conta e acessar o painel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleCreateInvite} className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
                  placeholder="E-mail do corretor"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit">Enviar convite</Button>
              </form>

              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando convites...</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{invite.email}</p>
                        <div className="flex items-center gap-2">
                          <InviteStatusBadge status={invite.status} />
                          <span className="text-xs text-muted-foreground">
                            Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
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
                    </div>
                  ))}
                  {invites.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Nenhum convite enviado ainda.
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {can('access.manage') ? (
          <Card>
            <CardHeader>
              <CardTitle>Acesso por empreendimento</CardTitle>
              <CardDescription>
                Libere empreendimentos para corretores que já aceitaram o convite. Todas as unidades
                do empreendimento ficam disponíveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {brokers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum corretor vinculado ainda. Envie e aguarde a aceitação do convite.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="broker-select">Corretor</Label>
                    <select
                      id="broker-select"
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                      value={selectedBrokerId ?? ''}
                      onChange={(e) =>
                        setSelectedBrokerId(e.target.value ? Number(e.target.value) : null)
                      }
                    >
                      <option value="">Selecione um corretor</option>
                      {brokers.map((broker) => (
                        <option key={broker.id} value={broker.id}>
                          {broker.name} ({broker.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedBroker ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {buildings.map((building) => {
                        const granted = grantedBuildingIds.has(building.id)

                        return (
                          <label
                            key={building.id}
                            className="flex items-start gap-2 rounded-md border p-3 text-sm"
                          >
                            <Checkbox
                              checked={granted}
                              onCheckedChange={() =>
                                void toggleBuildingAccess(selectedBroker.id, building.id, granted)
                              }
                            />
                            <span>
                              <span className="font-medium">{building.name}</span>
                              {building.city ? (
                                <span className="block text-xs text-muted-foreground">
                                  {building.city}
                                  {building.state ? `, ${building.state}` : ''}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </BuilderDashboardShell>
  )
}
