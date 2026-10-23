import type { LucideIcon } from 'lucide-react'

type ProposalSectionTitleProps = {
  icon: LucideIcon
  children: string
  description?: string
}

export function ProposalSectionTitle({ icon: Icon, children, description }: ProposalSectionTitleProps) {
  if (description === undefined) {
    return (
      <span className="inline-flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-base font-semibold">{children}</span>
      </span>
    )
  }

  return (
    <span className="flex w-full items-stretch gap-3">
      <span className="flex w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col justify-center">
        <span className="text-base font-semibold leading-snug">{children}</span>
        <span className="text-sm font-normal leading-snug text-muted-foreground">{description}</span>
      </span>
    </span>
  )
}
