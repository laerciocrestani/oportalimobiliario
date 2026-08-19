import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DashboardShell } from '@/components/layout/DashboardShell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { adminApi, type UserActivityEvent } from '@/lib/api'
import { defaultActivityRange, formatActivityTimestamp } from '@/lib/activity-range'

function optionalInteger(value: string): number | undefined {
  const trimmed = value.trim()

  if (trimmed === '') {
    return undefined
  }

  const parsed = Number(trimmed)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function ActivityPage() {
  const defaults = defaultActivityRange()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [userId, setUserId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [action, setAction] = useState('')
  const [events, setEvents] = useState<UserActivityEvent[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function currentFilters(nextPage = 1) {
    return {
      from,
      to,
      user_id: optionalInteger(userId),
      tenant_id: optionalInteger(tenantId),
      action: action.trim() === '' ? undefined : action.trim(),
      page: nextPage,
    }
  }

  async function load(nextPage = 1) {
    setLoading(true)
    setError(null)

    try {
      const result = await adminApi.listActivity(currentFilters(nextPage))
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
    void load(1)
  }, [])

  function handleFilter(event: FormEvent) {
    event.preventDefault()
    void load(1)
  }

  async function handleExport() {
    setExporting(true)
    setError(null)

    try {
      const blob = await adminApi.exportActivity(currentFilters())
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `atividade-${from}-${to}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Não foi possível exportar o CSV.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <DashboardShell role="admin" title="Atividade">
      <div className="flex flex-col gap-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Log da plataforma</CardTitle>
            <CardDescription>
              Consulte eventos de qualquer usuário ou construtora. A exportação CSV usa os mesmos
              filtros, sem teto de período.
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
              <div className="flex flex-col gap-1">
                <Label htmlFor="activity-user">Usuário (id)</Label>
                <Input
                  id="activity-user"
                  inputMode="numeric"
                  value={userId}
                  onChange={(change) => setUserId(change.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="activity-tenant">Tenant (id)</Label>
                <Input
                  id="activity-tenant"
                  inputMode="numeric"
                  value={tenantId}
                  onChange={(change) => setTenantId(change.target.value)}
                />
              </div>
              <div className="flex min-w-44 flex-col gap-1">
                <Label htmlFor="activity-action">Action</Label>
                <Input
                  id="activity-action"
                  value={action}
                  placeholder="auth.login"
                  onChange={(change) => setAction(change.target.value)}
                />
              </div>
              <Button type="submit">Filtrar</Button>
              <Button type="button" variant="outline" disabled={exporting} onClick={() => void handleExport()}>
                Exportar CSV
              </Button>
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
                    <TableHead>Usuário</TableHead>
                    <TableHead>Evento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatActivityTimestamp(item.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {item.actor?.name ?? `#${item.actor_user_id ?? '—'}`}
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
    </DashboardShell>
  )
}
