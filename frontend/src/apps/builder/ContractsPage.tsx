import { useEffect, useRef, useState } from 'react'
import { BuilderDashboardShell } from '@/apps/builder/components/BuilderDashboardShell'
import { useBuilderPermissions } from '@/apps/builder/hooks/use-builder-permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  builderApi,
  type ContractCustomVariable,
  type ContractSystemVariable,
  type ContractTemplate,
} from '@/lib/api'

type FormState = {
  name: string
  body_markdown: string
  is_active: boolean
  custom_variables: ContractCustomVariable[]
}

const emptyForm: FormState = {
  name: '',
  body_markdown: '',
  is_active: true,
  custom_variables: [],
}

function insertAtCursor(value: string, insertion: string, textarea: HTMLTextAreaElement | null): string {
  if (textarea === null) {
    return `${value}${insertion}`
  }

  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  return `${value.slice(0, start)}${insertion}${value.slice(end)}`
}

export function ContractsPage() {
  const { can, loading: permissionsLoading } = useBuilderPermissions()
  const canManageContracts = can('contracts.manage')
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [variables, setVariables] = useState<ContractSystemVariable[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  async function load() {
    try {
      setError(null)
      const [nextTemplates, nextVariables] = await Promise.all([
        builderApi.listContractTemplates(),
        builderApi.listContractVariables(),
      ])
      setTemplates(nextTemplates)
      setVariables(nextVariables)
    } catch {
      setError('Não foi possível carregar os modelos de contrato.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!permissionsLoading && canManageContracts) {
      void load()
    }
  }, [canManageContracts, permissionsLoading])

  function insertVariable(slug: string) {
    setForm((current) => ({
      ...current,
      body_markdown: insertAtCursor(current.body_markdown, `{{${slug}}}`, bodyRef.current),
    }))
    bodyRef.current?.focus()
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const payload = {
      name: form.name.trim(),
      body_markdown: form.body_markdown,
      is_active: form.is_active,
      custom_variables: form.custom_variables.filter((item) => item.slug.trim() !== ''),
    }

    try {
      if (editingId === null) {
        await builderApi.createContractTemplate(payload)
      } else {
        await builderApi.updateContractTemplate(editingId, payload)
      }

      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch {
      setError('Não foi possível salvar o modelo.')
    }
  }

  function startEdit(template: ContractTemplate) {
    setEditingId(template.id)
    setForm({
      name: template.name,
      body_markdown: template.body_markdown,
      is_active: template.is_active,
      custom_variables: template.custom_variables ?? [],
    })
  }

  async function handleDelete(template: ContractTemplate) {
    setError(null)

    try {
      await builderApi.deleteContractTemplate(template.id)
      if (editingId === template.id) {
        setForm(emptyForm)
        setEditingId(null)
      }
      await load()
    } catch {
      setError('Não foi possível excluir o modelo.')
    }
  }

  if (!permissionsLoading && !canManageContracts) {
    return (
      <BuilderDashboardShell title="Contratos">
        <p className="text-sm text-muted-foreground">Você não tem permissão para gerenciar contratos.</p>
      </BuilderDashboardShell>
    )
  }

  return (
    <BuilderDashboardShell title="Contratos">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Modelos</CardTitle>
            <CardDescription>Modelos do tenant. Inativos não aparecem na emissão.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>
            ) : (
              <ul className="space-y-3">
                {templates.map((template) => (
                  <li key={template.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.is_active ? 'Ativo' : 'Inativo'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => startEdit(template)}>
                        Editar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => void handleDelete(template)}>
                        Excluir
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingId === null ? 'Novo modelo' : 'Editar modelo'}</CardTitle>
            <CardDescription>
              Use Markdown. Clique numa variável da legenda para inserir no texto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-2">
                <Label htmlFor="contract-name">Nome</Label>
                <Input
                  id="contract-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-body">Texto (Markdown)</Label>
                <Textarea
                  id="contract-body"
                  ref={bodyRef}
                  rows={12}
                  value={form.body_markdown}
                  onChange={(event) => setForm((current) => ({ ...current, body_markdown: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Legenda de variáveis</p>
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable) => (
                    <Button
                      key={variable.slug}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => insertVariable(variable.slug)}
                    >
                      {variable.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Variáveis custom</p>
                {form.custom_variables.map((variable, index) => (
                  <div key={`custom-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      placeholder="slug"
                      value={variable.slug}
                      onChange={(event) =>
                        setForm((current) => {
                          const next = [...current.custom_variables]
                          next[index] = { ...next[index], slug: event.target.value }
                          return { ...current, custom_variables: next }
                        })
                      }
                    />
                    <Input
                      placeholder="Rótulo"
                      value={variable.label}
                      onChange={(event) =>
                        setForm((current) => {
                          const next = [...current.custom_variables]
                          next[index] = { ...next[index], label: event.target.value }
                          return { ...current, custom_variables: next }
                        })
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          custom_variables: current.custom_variables.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      custom_variables: [...current.custom_variables, { slug: '', label: '' }],
                    }))
                  }
                >
                  Adicionar variável custom
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="contract-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, is_active: checked === true }))
                  }
                />
                <Label htmlFor="contract-active">Modelo ativo (aparece na emissão)</Label>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex gap-2">
                <Button type="submit">{editingId === null ? 'Criar modelo' : 'Salvar alterações'}</Button>
                {editingId !== null ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null)
                      setForm(emptyForm)
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </BuilderDashboardShell>
  )
}
