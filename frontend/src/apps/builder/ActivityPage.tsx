import { useEffect, useState, type FormEvent } from 'react'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
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
import {
  builderApi,
  type ActivityMember,
  type UserActivityEvent,
} from '@/lib/api'
import { defaultActivityRange, formatActivityTimestamp } from '@/lib/activity-range'

const OWN_LOG_VALUE = 'me'

export function ActivityPage() {
  const { user, can } = useBuilderPermissions()
  const canAudit = can('audit.view')
  const defaults = defaultActivityRange()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [members, setMembers] = useState<ActivityMember[]>([])
  const [events, setEvents] = useState<UserActivityEvent[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(nextPage = 1, userId = selectedUserId) {
    setLoading(true)
    setError(null)

    try {
      const result = await builderApi.listActivity({
        from,
        to,
        user_id: userId ?? undefined,
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
    if (!canAudit) {
      setMembers([])
      return
    }

    void builderApi
      .listActivityMembers()
      .then(setMembers)
      .catch(() => setMembers([]))
  }, [canAudit])

  function handleFilter(event: FormEvent) {
    event.preventDefault()
    void load(1, selectedUserId)
  }

  const otherMembers = members.filter((member) => member.id !== user?.id)

  return (
    <BuilderDashboardShell title="Atividade">
      <div className="flex flex-col gap-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Histórico pessoal</CardTitle>
            <CardDescription>
              Eventos dos últimos 30 dias por padrão. Quem audita a equipe pode ver o log de
              outro membro.
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
              {canAudit ? (
                <div className="flex min-w-56 flex-col gap-1">
                  <Label htmlFor="activity-member">Membro</Label>
                  <Select
                    value={selectedUserId === null ? OWN_LOG_VALUE : String(selectedUserId)}
                    onValueChange={(value) => {
                      if (value === null) {
                        return
                      }

                      setSelectedUserId(value === OWN_LOG_VALUE ? null : Number(value))
                    }}
                  >
                    <SelectTrigger id="activity-member">
                      <SelectValue placeholder="Meu histórico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OWN_LOG_VALUE}>Meu histórico</SelectItem>
                      {otherMembers.map((member) => (
                        <SelectItem key={member.id} value={String(member.id)}>
                          {member.name}
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
    </BuilderDashboardShell>
  )
}
