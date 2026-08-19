import { useEffect, useState, type FormEvent } from 'react'
import { BrokerDashboardShell } from '@/apps/broker/components/BrokerDashboardShell'
import {
  getBuilderFilterOptions,
  groupUnitsByBuilding,
} from '@/apps/broker/lib/group-units-by-building'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { brokerApi, type UserActivityEvent } from '@/lib/api'
import { defaultActivityRange, formatActivityTimestamp } from '@/lib/activity-range'

const ALL_TENANTS_VALUE = 'all'

export function ActivityPage() {
  const defaults = defaultActivityRange()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [tenantId, setTenantId] = useState<number | null>(null)
  const [tenants, setTenants] = useState<Array<{ id: number; name: string }>>([])
  const [events, setEvents] = useState<UserActivityEvent[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(nextPage = 1, nextTenantId = tenantId) {
    setLoading(true)
    setError(null)

    try {
      const result = await brokerApi.listActivity({
        from,
        to,
        tenant_id: nextTenantId ?? undefined,
        page: nextPage,
      })
      setEvents(result.data)
      setPage(result.current_page)
      setLastPage(result.last_page)
    } catch {
      setError('Não foi possível carregar a atividade.')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1, null)
  }, [])

  useEffect(() => {
    void brokerApi
      .listUnits()
      .then((units) => setTenants(getBuilderFilterOptions(groupUnitsByBuilding(units))))
      .catch(() => setTenants([]))
  }, [])

  function handleFilter(event: FormEvent) {
    event.preventDefault()
    void load(1, tenantId)
  }

  return (
    <BrokerDashboardShell title="Atividade">
      <div className="flex flex-col gap-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Histórico pessoal</CardTitle>
            <CardDescription>
              Seus eventos nos últimos 30 dias. Filtre por construtora quando quiser ver só um
              tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <form className="flex flex-wrap items-end gap-4" onSubmit={handleFilter}>
              <div className="flex flex-col gap-1">
                <Label htmlFor="activity-from">De</Label>
                <Input
                  id="activity-from"
                  type="date"
                  value={from}
                  onChange={(change) => setFrom(change.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="activity-to">Até</Label>
                <Input
                  id="activity-to"
                  type="date"
                  value={to}
                  onChange={(change) => setTo(change.target.value)}
                  required
                />
              </div>
              {tenants.length > 0 ? (
                <div className="flex min-w-56 flex-col gap-1">
                  <Label htmlFor="activity-tenant">Construtora</Label>
                  <Select
                    value={tenantId === null ? ALL_TENANTS_VALUE : String(tenantId)}
                    onValueChange={(value) => {
                      if (value === null) {
                        return
                      }

                      setTenantId(value === ALL_TENANTS_VALUE ? null : Number(value))
                    }}
                  >
                    <SelectTrigger id="activity-tenant">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_TENANTS_VALUE}>Todas</SelectItem>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={String(tenant.id)}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <Button type="submit">Filtrar</Button>
            </form>

            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando atividade…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento no período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Evento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatActivityTimestamp(item.created_at)}
                      </TableCell>
                      <TableCell>{item.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {lastPage > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => void load(page - 1)}
                >
                  Anterior
                </Button>
                <p className="text-sm text-muted-foreground">
                  Página {page} de {lastPage}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= lastPage || loading}
                  onClick={() => void load(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </BrokerDashboardShell>
  )
}
