import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClockIcon } from 'lucide-react'
import { BrokerDashboardShell } from '@/apps/broker/components/BrokerDashboardShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { brokerApi } from '@/lib/api'
import { formatShortDate } from '@/lib/format-relative-time'

export function PendingApprovalPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<
    Array<{ tenant_id: number; tenant_name: string; requested_at: string }>
  >([])

  useEffect(() => {
    async function load() {
      try {
        const profile = await brokerApi.getProfile()

        if (profile.access_status === 'active') {
          navigate('/', { replace: true })
          return
        }

        if (profile.access_status === 'restricted') {
          navigate('/account-restricted', { replace: true })
          return
        }

        setPending(profile.pending_approvals)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <BrokerDashboardShell title="Aguardando aprovação">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="size-5" />
            Solicitação enviada
          </CardTitle>
          <CardDescription>
            Sua solicitação foi recebida. A construtora precisa aprovar seu acesso antes de liberar
            os empreendimentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma solicitação pendente no momento.
            </p>
          ) : (
            <ul className="space-y-3">
              {pending.map((item) => (
                <li
                  key={item.tenant_id}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{item.tenant_name}</p>
                  <p className="text-muted-foreground">
                    Solicitado em {formatShortDate(item.requested_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </BrokerDashboardShell>
  )
}
