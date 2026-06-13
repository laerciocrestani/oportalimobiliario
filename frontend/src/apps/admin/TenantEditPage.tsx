import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { adminApi, type TenantDetail } from '@/lib/api'

export function TenantEditPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadTenant = useCallback(async () => {
    if (!tenantId) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await adminApi.getTenant(Number(tenantId))
      setTenant(data)
      setName(data.name)
      setSlug(data.slug)
      setActive(data.active)
    } catch {
      setError('Construtora não encontrada.')
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void loadTenant()
  }, [loadTenant])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!tenant) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await adminApi.updateTenant(tenant.id, { name, slug, active })
      setTenant(updated)
      setSuccess('Construtora salva com sucesso.')
    } catch {
      setError('Não foi possível salvar. Verifique os dados informados.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell role="admin" title={tenant ? `Editar ${tenant.name}` : 'Editar construtora'}>
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Tenants
            </Link>
            <span>/</span>
            <span>Editar</span>
          </div>
          <Link
            to="/"
            className="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            Voltar
          </Link>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {error && !loading ? <p className="text-sm text-destructive">{error}</p> : null}

        {tenant && !loading ? (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
            <div>
              <h2 className="text-base font-semibold">Dados da construtora</h2>
              {tenant.users_count !== undefined ? (
                <p className="text-sm text-muted-foreground">
                  {tenant.users_count} usuário(s) na equipe
                </p>
              ) : null}
            </div>

            {success ? <p className="text-sm text-green-600">{success}</p> : null}

            <div className="space-y-2">
              <Label htmlFor="tenant-name">Nome</Label>
              <Input
                id="tenant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-slug">Slug</Label>
              <Input
                id="tenant-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="tenant-active"
                checked={active}
                onCheckedChange={(checked) => setActive(checked === true)}
              />
              <Label htmlFor="tenant-active">Construtora ativa</Label>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        ) : null}
      </div>
    </DashboardShell>
  )
}
