import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  ReservationAttachmentField,
  type ReservationFileItem,
} from '@/components/reservations/ReservationAttachmentField'
import { builderApi, type ReservationWitnessCandidate } from '@/lib/api'

type BuilderSignedContractDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: number
  onSubmitted: () => void
}

export function BuilderSignedContractDialog({
  open,
  onOpenChange,
  reservationId,
  onSubmitted,
}: BuilderSignedContractDialogProps) {
  const [files, setFiles] = useState<ReservationFileItem[]>([])
  const [candidates, setCandidates] = useState<ReservationWitnessCandidate[]>([])
  const [witness1Id, setWitness1Id] = useState('')
  const [witness2Id, setWitness2Id] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadCandidates() {
      try {
        const members = await builderApi.listWitnessCandidates(reservationId)
        if (!cancelled) {
          setCandidates(members)
        }
      } catch {
        if (!cancelled) {
          setError('Não foi possível carregar a equipe para escolher as testemunhas.')
        }
      }
    }

    void loadCandidates()

    return () => {
      cancelled = true
    }
  }, [open, reservationId])

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setFiles([])
      setWitness1Id('')
      setWitness2Id('')
      setError(null)
    }

    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    const fileItem = files[0]
    if (!fileItem || witness1Id === '' || witness2Id === '') {
      return
    }

    setSubmitting(true)
    setError(null)
    setFiles((current) =>
      current.map((item) => (item.id === fileItem.id ? { ...item, state: 'uploading' } : item)),
    )

    try {
      await builderApi.uploadBuilderSignedContract(reservationId, fileItem.file, {
        witness1UserId: Number(witness1Id),
        witness2UserId: Number(witness2Id),
      })
      setFiles([])
      onOpenChange(false)
      onSubmitted()
    } catch {
      setError('Não foi possível enviar o contrato assinado pela construtora.')
      setFiles((current) =>
        current.map((item) =>
          item.id === fileItem.id
            ? { ...item, state: 'error', errorMessage: 'Falha no envio' }
            : item,
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    files.length > 0 && witness1Id !== '' && witness2Id !== '' && witness1Id !== witness2Id && !submitting

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar contrato assinado pela construtora</DialogTitle>
          <DialogDescription>
            Anexe o PDF assinado pela construtora e escolha duas testemunhas da equipe.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <ReservationAttachmentField
            files={files}
            onFilesChange={setFiles}
            accept="application/pdf"
            disabled={submitting}
            emptyLabel="Selecionar PDF assinado"
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="witness-1">Testemunha 1</Label>
            <select
              id="witness-1"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={witness1Id}
              disabled={submitting}
              onChange={(event) => setWitness1Id(event.target.value)}
            >
              <option value="">Selecionar membro da equipe</option>
              {candidates.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="witness-2">Testemunha 2</Label>
            <select
              id="witness-2"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={witness2Id}
              disabled={submitting}
              onChange={(event) => setWitness2Id(event.target.value)}
            >
              <option value="">Selecionar membro da equipe</option>
              {candidates.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {submitting ? 'Enviando...' : 'Enviar contrato assinado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
