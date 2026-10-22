import { useBuildingWizard } from '@/apps/builder/components/building-wizard-context'
import { formatPrice } from '@/apps/builder/lib/format-price'
import { floorKindLabel, floorLabel, type StackFloor, type StackUnit } from '@/apps/builder/lib/floor-stack'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function unitPriceLabel(unit: StackUnit): string {
  return formatPrice(unit.priceBase.trim() === '' ? null : unit.priceBase)
}

function floorOrigin(floor: StackFloor, referenceFloor: number | null): string {
  if (referenceFloor != null && floor.number === referenceFloor) {
    return 'Modelo'
  }

  if (floor.customized || floor.kind === 'hall' || floor.kind === 'garage') {
    return 'Preservado'
  }

  return 'Clonado'
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
  const unpriced = floors.flatMap((floor) =>
    floor.units.filter((unit) => unit.priceBase.trim() === '').map((unit) => unit.code),
  )
  const priceColumn = state.form.priceMode === 'fixed' ? 'Valor' : 'Valor-base'

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Revisão estrutural</h2>
            <p className="text-sm text-muted-foreground">
              {state.form.name || 'Empreendimento'} · Torre única ·{' '}
              {state.form.priceMode === 'fixed' ? 'Valor fixo' : 'INCC'}
            </p>
            {unpriced.length > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Sem valor, o corretor não reserva: {unpriced.join(', ')}.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => actions.setCurrentStep(1)}>
              Editar dados básicos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => actions.setCurrentStep(2)}>
              Editar estrutura
            </Button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Pavimentos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{floors.length}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Unidades</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{residential}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Vagas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{spots}</CardContent>
        </Card>
      </div>
      {towers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pavimento gerado.</p>
      ) : (
        towers.map((tower) => (
          <section key={tower.key} className="overflow-hidden rounded-md border">
            <h3 className="border-b px-3 py-2 text-sm font-medium">{tower.name}</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Pavimento</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Unidades</th>
                  <th className="px-3 py-2 font-medium">{priceColumn}</th>
                  <th className="px-3 py-2 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody>
                {tower.floors.map((floor) => (
                  <tr key={floor.number} className="border-t">
                    <td className="px-3 py-2">{floorLabel(floor.number)}</td>
                    <td className="px-3 py-2">{floorKindLabel(floor.kind)}</td>
                    <td className="px-3 py-2">
                      {floor.units.length === 0 ? 'Sem unidades' : floor.units.map((unit) => unit.code).join(', ')}
                    </td>
                    <td className="px-3 py-2">
                      {floor.units.length === 0 ? '—' : floor.units.map((unit) => unitPriceLabel(unit)).join(', ')}
                    </td>
                    <td className="px-3 py-2">{floorOrigin(floor, tower.referenceFloor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
      <Card size="sm">
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {[state.form.street, state.form.number].filter(Boolean).join(', ') || 'Endereço ainda não informado'}
          <br />
          {[state.form.neighborhood, state.form.city, state.form.state].filter(Boolean).join(' · ')}
        </CardContent>
      </Card>
    </div>
  )
}
