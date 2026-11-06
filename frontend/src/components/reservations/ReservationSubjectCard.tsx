import type { ReactNode } from 'react'
import { Building2Icon, CarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatListedPrice } from '@/lib/unit-listing'

export type ReservationSubjectGarageLine = {
  id: number
  code: string
  amount: number | null
  original: number | null
}

type ReservationSubjectCardProps = {
  buildingName: string
  unitCode: string
  unitAmount: number | null
  unitOriginal: number | null
  proposalTotal: string | null
  garageLines: ReservationSubjectGarageLine[]
  unitPrice?: ReactNode
  garagePrice?: ReactNode
}

export function ReservationSubjectCard({
  buildingName,
  unitCode,
  unitAmount,
  unitOriginal,
  proposalTotal,
  garageLines,
  unitPrice,
  garagePrice,
}: ReservationSubjectCardProps) {
  const hasGarages = garageLines.length > 0
  const pricedGarages = garageLines.filter((spot) => spot.amount != null)

  return (
    <section className="overflow-hidden rounded-xl border bg-card text-left" aria-label="Unidade da proposta">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Building2Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            {buildingName !== '' ? (
              <p className="truncate text-sm text-muted-foreground">{buildingName}</p>
            ) : null}
            <p className="truncate text-base font-semibold">
              {unitCode === '' ? 'Unidade —' : `Unidade ${unitCode}`}
            </p>
          </div>
        </div>
        {unitAmount != null && unitOriginal != null ? (
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Valor da unidade</p>
            {unitPrice ?? (
              <p className="text-lg font-semibold tabular-nums">{formatListedPrice(String(unitAmount))}</p>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 border-t bg-muted/40 px-4 py-2.5 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <CarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-medium">Vagas vinculadas</span>
          {hasGarages ? (
            garageLines.map((spot) => (
              <span key={spot.id} className="font-medium">{spot.code}</span>
            ))
          ) : (
            <>
              <Badge variant="secondary">Não informado</Badge>
              <span className="h-4 w-px bg-border" aria-hidden />
              <span className="text-muted-foreground">
                A identificação das vagas não foi informada nesta proposta.
              </span>
            </>
          )}
        </div>
        {garagePrice ?? (pricedGarages.length > 0 ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {pricedGarages.map((spot) => (
              <p key={spot.id} className="text-lg font-semibold tabular-nums">
                {formatListedPrice(String(spot.amount))}
              </p>
            ))}
          </div>
        ) : null)}
      </div>
      {proposalTotal ? (
        <div className="flex items-center justify-between gap-4 border-t px-4 py-2.5">
          <p className="text-sm font-medium">Total da proposta</p>
          <Badge className="h-auto px-3 py-1 text-sm font-medium tabular-nums">{proposalTotal}</Badge>
        </div>
      ) : null}
    </section>
  )
}
