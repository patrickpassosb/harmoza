/* HARMOZA — Estado vazio (orientação quando não há dados) */
import type { ReactNode } from 'react'
import { FileSpreadsheet } from 'lucide-react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon ?? <FileSpreadsheet className="h-7 w-7" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
