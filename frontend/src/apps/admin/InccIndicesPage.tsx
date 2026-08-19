import { useEffect, useState, type FormEvent } from 'react'
import { RefreshCwIcon } from 'lucide-react'
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
import { adminApi, ApiRequestError, type InccHint, type InccIndex } from '@/lib/api'

function formatCompetence(competence: string): string {
  const [year, month] = competence.split('-')

  return year && month ? `${month}/${year}` : competence
}

function sourceLabel(source: InccIndex['source']): string {
  return source === 'job' ? 'Job' : 'Manual'
}

export function InccIndicesPage() {
  const [indices, setIndices] = useState<InccIndex[]>([])
  const [competence, setCompetence] = useState('')
  const [value, setValue] = useState('')
  const [hint, setHint] = useState<InccHint | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setIndices(await adminApi.listInccIndices())
      setError(null)
    } catch {
      setError('Faça login como admin para gerenciar o INCC-M.')
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
      await adminApi.createInccIndex({
        competence,
        value: Number(value),
      })
      setCompetence('')
      setValue('')
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Não foi possível gravar o índice.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleHint() {
    setHintLoading(true)
    setError(null)

    try {
      setHint(await adminApi.getInccHint())
    } catch (caught) {
      setHint(null)
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Não foi possível consultar o Banco Central.',
      )
    } finally {
      setHintLoading(false)
    }
  }

  function applyHint() {
    if (!hint) {
      return
    }

    setCompetence(hint.competence)
    setValue(hint.value)
  }

  async function handleSaveRow(id: number, nextValue: number) {
    setSaving(true)
    setError(null)

    try {
      await adminApi.updateInccIndex(id, { value: nextValue })
      await load()
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Não foi possível atualizar o índice.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell role="admin" title="INCC-M">
      <div className="flex flex-col gap-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Sugestão do Banco Central</CardTitle>
            <CardDescription>
              Consulta o SGS e não grava. Confira se o valor é número-índice, não variação %.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button type="button" variant="outline" onClick={() => void handleHint()} disabled={hintLoading}>
              <RefreshCwIcon data-icon="inline-start" />
              {hintLoading ? 'Consultando...' : 'Consultar BCB'}
            </Button>
            {hint ? (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <p className="text-sm">
                  Competência {formatCompetence(hint.competence)} · valor {hint.value}
                </p>
                {hint.is_index_number ? null : (
                  <p className="text-sm text-destructive">
                    O BCB devolveu variação %, não o número-índice. Confira na FGV antes de gravar.
                  </p>
                )}
                <Button type="button" size="sm" variant="secondary" onClick={applyHint}>
                  Usar na criação
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novo índice</CardTitle>
            <CardDescription>A competência é gravada no primeiro dia do mês.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void handleCreate(event)}>
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
                <Field>
                  <FieldLabel htmlFor="incc-competence">Competência</FieldLabel>
                  <Input
                    id="incc-competence"
                    type="date"
                    value={competence}
                    onChange={(event) => setCompetence(event.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="incc-value">Valor</FieldLabel>
                  <Input
                    id="incc-value"
                    type="number"
                    step="0.000001"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Gravar'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabela INCC-M</CardTitle>
            <CardDescription>Edição do valor não altera a origem (job ou manual).</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
            {!loading && indices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum índice cadastrado.</p>
            ) : null}
            {indices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indices.map((index) => (
                    <InccIndexRow
                      key={index.id}
                      index={index}
                      saving={saving}
                      onSave={handleSaveRow}
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

function InccIndexRow({
  index,
  saving,
  onSave,
}: {
  index: InccIndex
  saving: boolean
  onSave: (id: number, value: number) => Promise<void>
}) {
  const [value, setValue] = useState(index.value)

  useEffect(() => {
    setValue(index.value)
  }, [index.value])

  return (
    <TableRow>
      <TableCell>{formatCompetence(index.competence)}</TableCell>
      <TableCell>
        <Input
          aria-label={`Valor ${formatCompetence(index.competence)}`}
          type="number"
          step="0.000001"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </TableCell>
      <TableCell>
        <Badge variant={index.source === 'job' ? 'secondary' : 'outline'}>{sourceLabel(index.source)}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => void onSave(index.id, Number(value))}
        >
          Salvar
        </Button>
      </TableCell>
    </TableRow>
  )
}
