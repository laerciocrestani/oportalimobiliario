import { CheckIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PendingBroker } from '@/lib/api'
import { formatRelativeTimePtBr } from '@/lib/format-relative-time'

type PendingBrokersSectionProps = {
  pendingBrokers: PendingBroker[]
  loading: boolean
  onApprove: (broker: PendingBroker) => void
  onReject: (broker: PendingBroker) => void
}

export function PendingBrokersSection({
  pendingBrokers,
  loading,
  onApprove,
  onReject,
}: PendingBrokersSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solicitações pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando solicitações...</p>
        </CardContent>
      </Card>
    )
  }

  if (pendingBrokers.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Solicitações pendentes
          <Badge variant="secondary">{pendingBrokers.length}</Badge>
        </CardTitle>
        <CardDescription>
          Corretores que pediram acesso e aguardam aprovação. A aprovação de um empreendimento libera só ele.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Solicitado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingBrokers.map((broker) => (
              <TableRow key={broker.building_request_id ? `building-${broker.building_request_id}` : `broker-${broker.id}`}>
                <TableCell className="font-medium">{broker.name}</TableCell>
                <TableCell>{broker.building_name ?? '—'}</TableCell>
                <TableCell>{broker.email ?? broker.phone ?? '—'}</TableCell>
                <TableCell>{formatRelativeTimePtBr(broker.requested_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onApprove(broker)}
                    >
                      <CheckIcon />
                      Aprovar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => onReject(broker)}
                    >
                      <XIcon />
                      Recusar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
