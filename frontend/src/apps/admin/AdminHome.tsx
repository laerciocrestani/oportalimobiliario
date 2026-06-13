import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TenantImpersonateDialog } from '@/apps/admin/components/TenantImpersonateDialog'
import { adminApi, type Tenant } from '@/lib/api'

export function AdminHome() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [impersonateTenant, setImpersonateTenant] = useState<Tenant | null>(null)

  async function load() {
    try {
      const page = await adminApi.listTenants()
      setTenants(page.data)
      setError(null)
    } catch {
      setError('Faça login como admin para gerenciar tenants.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await adminApi.createTenant({ name, slug: slug || undefined, active: true })
    setName('')
    setSlug('')
    await load()
  }

  async function toggleActive(tenant: Tenant) {
    await adminApi.updateTenant(tenant.id, { active: !tenant.active })
    await load()
  }

  return (
    <DashboardShell role="admin" title="Tenants">
      <div className="space-y-8">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Nome da construtora"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="min-w-[160px] rounded-md border border-input px-3 py-2 text-sm"
            placeholder="slug (opcional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <Button type="submit">Criar tenant</Button>
        </form>

        <ul className="divide-y rounded-lg border">
          {tenants.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.slug}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/tenants/${t.id}/edit`}
                  className="inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                >
                  Editar
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!t.active}
                  onClick={() => setImpersonateTenant(t)}
                >
                  Acessar como construtora
                </Button>
                <Button variant="outline" size="sm" onClick={() => void toggleActive(t)}>
                  {t.active ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <TenantImpersonateDialog
        tenant={impersonateTenant}
        open={impersonateTenant !== null}
        onOpenChange={(open) => {
          if (!open) {
            setImpersonateTenant(null)
          }
        }}
      />
    </DashboardShell>
  )
}
