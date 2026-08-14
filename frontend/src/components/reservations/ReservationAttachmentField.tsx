import { useRef, useState } from 'react'
import { FileTextIcon, ImageIcon, LoaderCircleIcon, XIcon } from 'lucide-react'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ReservationFileItem = {
  id: string
  file: File
  previewUrl?: string
  state: 'idle' | 'uploading' | 'processing' | 'error' | 'done'
  errorMessage?: string
}

type ReservationAttachmentFieldProps = {
  files: ReservationFileItem[]
  onFilesChange: (files: ReservationFileItem[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
  emptyLabel?: string
}

function formatFileMeta(file: File): string {
  const extension = file.name.split('.').pop()?.toUpperCase() ?? 'ARQ'
  const sizeKb = Math.max(1, Math.round(file.size / 1024))
  const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`

  return `${extension} · ${sizeLabel}`
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function ReservationAttachmentField({
  files,
  onFilesChange,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  multiple = false,
  disabled = false,
  className,
  emptyLabel = 'Selecionar arquivo',
}: ReservationAttachmentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSelect(nextFiles: FileList | null) {
    if (!nextFiles || nextFiles.length === 0) {
      return
    }

    const selected = Array.from(nextFiles).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: isImageFile(file) ? URL.createObjectURL(file) : undefined,
      state: 'idle' as const,
    }))

    onFilesChange(multiple ? [...files, ...selected] : selected.slice(0, 1))
  }

  function handleRemove(id: string) {
    const target = files.find((item) => item.id === id)
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl)
    }

    onFilesChange(files.filter((item) => item.id !== id))
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleSelect(event.target.files)
          event.target.value = ''
        }}
      />

      {files.length > 0 ? (
        <AttachmentGroup
          className={cn(
            'w-full',
            multiple && 'flex-col overflow-x-visible snap-none overscroll-auto',
          )}
        >
          {files.map((item) => (
            <Attachment key={item.id} state={item.state} className="w-full">
              <AttachmentMedia variant={item.previewUrl ? 'image' : 'icon'}>
                {item.state === 'uploading' ? (
                  <LoaderCircleIcon className="animate-spin" data-slot="spinner" />
                ) : item.previewUrl ? (
                  <img src={item.previewUrl} alt={item.file.name} />
                ) : isImageFile(item.file) ? (
                  <ImageIcon />
                ) : (
                  <FileTextIcon />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{item.file.name}</AttachmentTitle>
                <AttachmentDescription>
                  {item.state === 'error'
                    ? item.errorMessage ?? 'Falha no envio'
                    : item.state === 'uploading'
                      ? 'Enviando...'
                      : formatFileMeta(item.file)}
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  aria-label={`Remover ${item.file.name}`}
                  disabled={disabled || item.state === 'uploading'}
                  onClick={() => handleRemove(item.id)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      ) : null}

      {files.length === 0 || multiple ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {files.length === 0 ? emptyLabel : 'Adicionar outro arquivo'}
        </Button>
      ) : null}
    </div>
  )
}

export function useReservationFileItems(initial: ReservationFileItem[] = []) {
  const [files, setFiles] = useState<ReservationFileItem[]>(initial)

  return { files, setFiles }
}
