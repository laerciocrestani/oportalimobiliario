import { useEffect, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { adminApi, ApiRequestError, type Amenity } from '@/lib/api'

export function AmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setAmenities(await adminApi.listAmenities())
      setError(null)
    } catch {
      setError('Faça login como admin para gerenciar adicionais.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await adminApi.createAmenity({ name })
      setName('')
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Não foi possível criar o adicional.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleSave(id: number, data: Partial<Pick<Amenity, 'name' | 'active'>>) {
    setSaving(true)
    setError(null)

    try {
      await adminApi.updateAmenity(id, data)
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Não foi possível atualizar o adicional.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell role="admin" title="Adicionais">
      <div className="flex flex-col gap-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Novo adicional</CardTitle>
            <CardDescription>
              Catálogo fechado da plataforma. A construtora só seleciona itens ativos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void handleCreate(event)}>
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Field>
                  <FieldLabel htmlFor="amenity-name">Nome</FieldLabel>
                  <Input
                    id="amenity-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Criar'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catálogo</CardTitle>
            <CardDescription>Itens inativos deixam de aparecer para a construtora.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
            {!loading && amenities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum adicional cadastrado.</p>
            ) : null}
            {amenities.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amenities.map((amenity) => (
                    <AmenityRow
                      key={amenity.id}
                      amenity={amenity}
                      saving={saving}
                      onSave={handleSave}
                    />
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

function AmenityRow({
  amenity,
  saving,
  onSave,
}: {
  amenity: Amenity
  saving: boolean
  onSave: (id: number, data: Partial<Pick<Amenity, 'name' | 'active'>>) => Promise<void>
}) {
  const [name, setName] = useState(amenity.name)

  useEffect(() => {
    setName(amenity.name)
  }, [amenity.name])

  return (
    <TableRow>
      <TableCell>
        <Input
          aria-label={`Nome ${amenity.slug}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </TableCell>
      <TableCell className="text-muted-foreground">{amenity.slug}</TableCell>
      <TableCell>
        <Badge variant={amenity.active ? 'secondary' : 'outline'}>
          {amenity.active ? 'Ativo' : 'Inativo'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => void onSave(amenity.id, { name })}
          >
            Salvar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => void onSave(amenity.id, { active: !amenity.active })}
          >
            {amenity.active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
