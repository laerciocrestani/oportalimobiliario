import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldOffIcon } from 'lucide-react'
import { BrokerDashboardShell } from '@/apps/broker/components/BrokerDashboardShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { brokerApi } from '@/lib/api'
import { formatShortDate } from '@/lib/format-relative-time'

export function RestrictedAccessPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [inactiveTenants, setInactiveTenants] = useState<
    Array<{ tenant_id: number; tenant_name: string; revoked_at: string | null }>
  >([])

  useEffect(() => {
    async function load() {
      try {
        const profile = await brokerApi.getProfile()

        if (profile.access_status === 'active') {
          navigate('/', { replace: true })
          return
        }

        if (profile.access_status === 'pending_only') {
          navigate('/pending-approval', { replace: true })
          return
        }

        setInactiveTenants(profile.inactive_tenants)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <BrokerDashboardShell title="Acesso restrito">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOffIcon className="size-5" />
            Acesso ao portal restrito
          </CardTitle>
          <CardDescription>
            Sua conta continua ativa, mas você não tem acesso aos empreendimentos no momento. Entre
            em contato com a construtora para reativar seu vínculo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : inactiveTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum vínculo encontrado. Solicite um novo convite à construtora.
            </p>
          ) : (
            <ul className="space-y-3">
              {inactiveTenants.map((tenant) => (
                <li
                  key={tenant.tenant_id}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{tenant.tenant_name}</p>
                  {tenant.revoked_at ? (
                    <p className="text-muted-foreground">
                      Inativado em {formatShortDate(tenant.revoked_at)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </BrokerDashboardShell>
  )
}
