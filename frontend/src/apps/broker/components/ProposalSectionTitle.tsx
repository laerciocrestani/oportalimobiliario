import type { LucideIcon } from 'lucide-react'

type ProposalSectionTitleProps = {
  icon: LucideIcon
  children: string
}

export function ProposalSectionTitle({ icon: Icon, children }: ProposalSectionTitleProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="text-base font-semibold">{children}</span>
    </span>
  )
}
