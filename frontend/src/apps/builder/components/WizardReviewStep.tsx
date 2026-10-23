import { Building2Icon, CarIcon, DoorOpenIcon, LayersIcon } from 'lucide-react'
import { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'
import { floorKindLabel, floorLabel, type StackFloor } from '@/apps/builder/lib/floor-stack'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function floorOrigin(floor: StackFloor, referenceFloor: number | null): string {
  if (referenceFloor != null && floor.number === referenceFloor) {
    return 'Modelo'
  }

  if (floor.customized || floor.kind === 'hall' || floor.kind === 'garage') {
    return 'Preservado'
  }

  return 'Clonado'
}

function numbering(floor: StackFloor): string {
  if (floor.units.length === 0) {
    return '—'
  }

  const codes = floor.units.map((unit) => unit.code)

  if (codes.length === 1) {
    return codes[0]
  }

  return `${codes[0]} a ${codes[codes.length - 1]}`
}

function occupancy(floor: StackFloor): string {
  if (floor.units.length === 0) {
    return 'Sem unidades'
  }

  if (floor.kind === 'garage') {
    return `${floor.units.length} vagas`
  }

  if (floor.kind === 'commercial') {
    return `${floor.units.length} salas`
  }

  return `${floor.units.length} apartamentos`
}

export function WizardReviewStep() {
  const { state, actions } = useBuildingWizard()
  const towers = state.stackTowers
  const floors = towers.flatMap((tower) => tower.floors)
  const residential = floors
    .filter((floor) => floor.kind === 'residential' || floor.kind === 'commercial')
    .reduce((total, floor) => total + floor.units.length, 0)
  const spots = floors
    .filter((floor) => floor.kind === 'garage')
    .reduce((total, floor) => total + floor.units.length, 0)
  const halls = floors.filter((floor) => floor.kind === 'hall').length
  const unpriced = floors.flatMap((floor) =>
    floor.units.filter((unit) => unit.priceBase.trim() === '').map((unit) => unit.code),
  )
  const address = [state.form.street, state.form.number].filter(Boolean).join(', ')
  const place = [state.form.neighborhood, state.form.city, state.form.state].filter(Boolean).join(' · ')
  const zip = state.form.zip

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Revisão estrutural</h2>
          <p className="text-sm text-muted-foreground">Confira a estrutura antes de concluir</p>
          <p className="text-sm text-muted-foreground">
            {state.form.name || 'Empreendimento'} · {towers.length} {towers.length === 1 ? 'torre' : 'torres'}
            {place ? ` · ${place}` : ''}
            {state.form.priceMode === 'fixed' ? ' · Valor fixo' : ' · INCC'}
          </p>
        </div>
        <p className="text-xs text-emerald-700">
          {unpriced.length > 0
            ? `Sem valor, o corretor não reserva: ${unpriced.join(', ')}.`
            : 'Sem conflitos de numeração'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pavimentos no total</CardTitle>
            <LayersIcon className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{floors.length}</p>
            <p className="text-xs text-muted-foreground">residenciais, térreo e subsolo</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Unidades residenciais</CardTitle>
            <Building2Icon className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{residential}</p>
            <p className="text-xs text-muted-foreground">apartamentos e salas</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Vagas de garagem</CardTitle>
            <CarIcon className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{spots}</p>
            <p className="text-xs text-muted-foreground">subsolos</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Térreo / hall</CardTitle>
            <DoorOpenIcon className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{halls}</p>
            <p className="text-xs text-muted-foreground">áreas comuns, sem unidades privadas</p>
          </CardContent>
        </Card>
      </div>
      {towers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pavimento gerado.</p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          {towers.map((tower) => (
            <section key={tower.key} className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                <h3 className="text-sm font-medium">{tower.name}</h3>
                <Button type="button" variant="link" size="sm" onClick={() => actions.setCurrentStep(2)}>
                  Editar estrutura
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Pavimento</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Unidades / vagas</th>
                    <th className="px-3 py-2 font-medium">Numeração</th>
                    <th className="px-3 py-2 font-medium">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {[...tower.floors].toSorted((left, right) => right.number - left.number).map((floor) => (
                    <tr key={floor.number} className="border-t">
                      <td className="px-3 py-2">{floorLabel(floor.number)}</td>
                      <td className="px-3 py-2">{floor.kind === 'hall' ? 'Hall / áreas comuns' : floorKindLabel(floor.kind)}</td>
                      <td className="px-3 py-2">{occupancy(floor)}</td>
                      <td className="px-3 py-2">{numbering(floor)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={floorOrigin(floor, tower.referenceFloor) === 'Clonado' ? 'outline' : 'secondary'}>
                          {floorOrigin(floor, tower.referenceFloor)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
          <Card size="sm">
            <CardHeader>
              <CardTitle>{state.form.name || 'Empreendimento'}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="text-xs text-muted-foreground">{towers.length} {towers.length === 1 ? 'torre' : 'torres'}</p>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Endereço</p>
                <p>{address || 'Endereço ainda não informado'}</p>
                {place ? <p>{place}</p> : null}
                {zip ? <p>CEP {zip}</p> : null}
              </div>
              <Button type="button" variant="link" className="h-auto justify-start px-0" onClick={() => actions.setCurrentStep(1)}>
                Editar dados básicos
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
