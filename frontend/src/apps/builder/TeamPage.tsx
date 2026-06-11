import { useEffect, useState } from 'react'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import {
  BUILDER_PERMISSIONS,
  builderPermissionLabels,
  type BuilderPermission,
} from '@/apps/builder/lib/builder-permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { builderApi, type TeamMember } from '@/lib/api'

type FormState = {
  name: string
  email: string
  password: string
  permissions: BuilderPermission[]
}

const emptyForm: FormState = {
  name: '',
  email: '',
  password: '',
  permissions: ['buildings.view'],
}

function PermissionCheckboxes({
  selected,
  onChange,
}: {
  selected: BuilderPermission[]
  onChange: (permissions: BuilderPermission[]) => void
}) {
  function toggle(permission: BuilderPermission, checked: boolean) {
    if (checked) {
      onChange([...selected, permission])
      return
    }

    onChange(selected.filter((item) => item !== permission))
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {BUILDER_PERMISSIONS.map((permission) => (
        <label key={permission} className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={selected.includes(permission)}
            onCheckedChange={(checked) => toggle(permission, checked === true)}
          />
          <span>{builderPermissionLabels[permission]}</span>
        </label>
      ))}
    </div>
  )
}

export function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setError(null)
      setMembers(await builderApi.listTeam())
    } catch {
      setError('Não foi possível carregar a equipe.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function startEdit(member: TeamMember) {
    setEditingId(member.id)
    setForm({
      name: member.name,
      email: member.email,
      password: '',
      permissions: member.permissions as BuilderPermission[],
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      if (editingId) {
        await builderApi.updateTeamMember(editingId, {
          name: form.name,
          ...(form.password ? { password: form.password } : {}),
          permissions: form.permissions,
        })
      } else {
        await builderApi.createTeamMember({
          name: form.name,
          email: form.email,
          password: form.password,
          permissions: form.permissions,
        })
      }

      resetForm()
      await load()
    } catch {
      setError('Não foi possível salvar o membro.')
    }
  }

  async function handleDelete(id: number) {
    setError(null)

    try {
      await builderApi.deleteTeamMember(id)
      if (editingId === id) {
        resetForm()
      }
      await load()
    } catch {
      setError('Não foi possível remover o membro.')
    }
  }

  return (
    <BuilderDashboardShell title="Equipe">
      <div className="space-y-8">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar membro' : 'Novo membro'}</CardTitle>
            <CardDescription>
              Crie usuários da construtora e defina as permissões individualmente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <input
                    id="name"
                    className="flex h-9 w-full rounded-md border border-input px-3 text-sm"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <input
                    id="email"
                    type="email"
                    className="flex h-9 w-full rounded-md border border-input px-3 text-sm disabled:opacity-60"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    disabled={editingId !== null}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingId ? 'Nova senha (opcional)' : 'Senha'}
                </Label>
                <input
                  id="password"
                  type="password"
                  className="flex h-9 w-full rounded-md border border-input px-3 text-sm"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={editingId === null}
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissões</Label>
                <PermissionCheckboxes
                  selected={form.permissions}
                  onChange={(permissions) => setForm({ ...form, permissions })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? 'Salvar' : 'Criar membro'}</Button>
                {editingId ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h3 className="text-lg font-medium">Membros</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">Permissões</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b last:border-b-0 align-top">
                      <td className="px-4 py-3 font-medium">{member.name}</td>
                      <td className="px-4 py-3">{member.email}</td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1 text-muted-foreground">
                          {member.permissions.map((permission) => (
                            <li key={permission}>
                              {builderPermissionLabels[permission as BuilderPermission] ??
                                permission}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(member)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete(member.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </BuilderDashboardShell>
  )
}
