import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { builderApi, type Building, type LinkedBroker } from '@/lib/api'

type BrokerAccessDialogProps = {
  broker: LinkedBroker | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void | Promise<void>
}

export function BrokerAccessDialog({
  broker,
  open,
  onOpenChange,
  onUpdated,
}: BrokerAccessDialogProps) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [grantedBuildingIds, setGrantedBuildingIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !broker) {
      return
    }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [allBuildings, grantedBuildings] = await Promise.all([
          builderApi.listBuildings(),
          builderApi.listBrokerBuildings(broker.id),
        ])

        setBuildings(allBuildings)
        setGrantedBuildingIds(new Set(grantedBuildings.map((building) => building.id)))
      } catch {
        setError('Não foi possível carregar os empreendimentos.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [broker, open])

  async function toggleBuildingAccess(buildingId: number, granted: boolean) {
    if (!broker) {
      return
    }

    setError(null)

    try {
      if (granted) {
        await builderApi.revokeBuildingAccess(broker.id, buildingId)
        setGrantedBuildingIds((current) => {
          const next = new Set(current)
          next.delete(buildingId)
          return next
        })
      } else {
        await builderApi.grantBuildingAccess(broker.id, buildingId)
        setGrantedBuildingIds((current) => new Set(current).add(buildingId))
      }

      await onUpdated()
    } catch {
      setError('Não foi possível atualizar o acesso ao empreendimento.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar acesso</DialogTitle>
          <DialogDescription>
            {broker
              ? `Libere empreendimentos para ${broker.name}.`
              : 'Selecione os empreendimentos do corretor.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}

        {!loading && buildings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum empreendimento cadastrado nesta construtora.
          </p>
        ) : null}

        {!loading && buildings.length > 0 ? (
          <div className="space-y-2">
            {buildings.map((building) => {
              const granted = grantedBuildingIds.has(building.id)

              return (
                <label
                  key={building.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  <Checkbox
                    checked={granted}
                    onCheckedChange={() => void toggleBuildingAccess(building.id, granted)}
                  />
                  <span className="text-sm">{building.name}</span>
                </label>
              )
            })}
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
