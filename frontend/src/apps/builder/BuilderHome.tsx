import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { builderApi } from '@/lib/api'

export function BuilderHome() {
  const { can } = useBuilderPermissions()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    try {
      setError(null)
      await builderApi.createInvite(inviteEmail)
      setInviteEmail('')
      setInviteSent(true)
    } catch {
      setError('Não foi possível enviar o convite.')
    }
  }

  return (
    <BuilderDashboardShell title="Visão geral">
      <div className="space-y-8">
        {can('buildings.view') ? (
          <Card>
            <CardHeader>
              <CardTitle>Empreendimentos</CardTitle>
              <CardDescription>
                Gerencie torres, unidades e acompanhe o status de vendas e reservas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link to="/buildings" />}>Ver empreendimentos</Button>
            </CardContent>
          </Card>
        ) : null}

        {can('invites.send') ? (
        <section id="convites" className="space-y-4">
          <h3 className="text-lg font-medium">Convidar corretor</h3>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {inviteSent && (
            <p className="text-sm text-muted-foreground">Convite enviado com sucesso.</p>
          )}
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
              placeholder="E-mail do corretor"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <Button type="submit">Enviar convite</Button>
          </form>
        </section>
        ) : null}
      </div>
    </BuilderDashboardShell>
  )
}
