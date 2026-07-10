import { Funnel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BrokerInvite } from '@/lib/api'

const statusLabels: Record<BrokerInvite['status'], string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  declined: 'Recusado',
  expired: 'Expirado',
  revoked: 'Revogado',
}

const channelLabels: Record<BrokerInvite['channel'], string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  link: 'Link',
}

const ALL_STATUS_VALUE = 'all'
const ALL_CHANNEL_VALUE = 'all'

type InviteFiltersDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  statusFilter: BrokerInvite['status'] | ''
  channelFilter: BrokerInvite['channel'] | ''
  onStatusFilterChange: (value: BrokerInvite['status'] | '') => void
  onChannelFilterChange: (value: BrokerInvite['channel'] | '') => void
  onClear: () => void
}

export function InviteFiltersDialog({
  open,
  onOpenChange,
  statusFilter,
  channelFilter,
  onStatusFilterChange,
  onChannelFilterChange,
  onClear,
}: InviteFiltersDialogProps) {
  const hasFilters = statusFilter !== '' || channelFilter !== ''

  const selectedStatusLabel =
    statusFilter === '' ? 'Todos os status' : statusLabels[statusFilter]

  const selectedChannelLabel =
    channelFilter === '' ? 'Todos os canais' : channelLabels[channelFilter]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Funnel className="size-5" />
            Filtros
          </DialogTitle>
          <DialogDescription>
            Refine a lista de convites por status e canal de envio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-status-filter">Status</Label>
            <Select
              value={statusFilter === '' ? ALL_STATUS_VALUE : statusFilter}
              onValueChange={(value) => {
                if (value === null) {
                  return
                }

                onStatusFilterChange(
                  value === ALL_STATUS_VALUE ? '' : (value as BrokerInvite['status']),
                )
              }}
            >
              <SelectTrigger
                id="invite-status-filter"
                className="w-full"
                aria-label="Filtrar por status"
              >
                <SelectValue placeholder="Todos os status">{selectedStatusLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS_VALUE}>Todos os status</SelectItem>
                {(Object.keys(statusLabels) as BrokerInvite['status'][]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-channel-filter">Canal</Label>
            <Select
              value={channelFilter === '' ? ALL_CHANNEL_VALUE : channelFilter}
              onValueChange={(value) => {
                if (value === null) {
                  return
                }

                onChannelFilterChange(
                  value === ALL_CHANNEL_VALUE ? '' : (value as BrokerInvite['channel']),
                )
              }}
            >
              <SelectTrigger
                id="invite-channel-filter"
                className="w-full"
                aria-label="Filtrar por canal"
              >
                <SelectValue placeholder="Todos os canais">{selectedChannelLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CHANNEL_VALUE}>Todos os canais</SelectItem>
                {(Object.keys(channelLabels) as BrokerInvite['channel'][]).map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channelLabels[channel]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={!hasFilters}
            onClick={onClear}
          >
            Limpar filtros
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
