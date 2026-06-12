import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'

export function BuilderHome() {
  const { can } = useBuilderPermissions()

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
          <Card>
            <CardHeader>
              <CardTitle>Corretores</CardTitle>
              <CardDescription>
                Convide corretores e gerencie o acesso aos empreendimentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link to="/invites" />}>Gerenciar convites</Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </BuilderDashboardShell>
  )
}
