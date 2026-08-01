// HARMOZA — renderizador de componentes do dashboard
// Converte DashComponent (types) em Widget (harmoza) e usa o WidgetRenderer.
import { MoreVertical, Copy, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WidgetRenderer } from '@/components/WidgetRenderer'
import type { DashComponent } from '@/lib/types'
import type { Widget } from '@/lib/harmoza'

export function DashCard({
  comp,
  onRemove,
  onDuplicate,
  onMove,
}: {
  comp: DashComponent
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (id: string, pos: 'top' | 'bottom') => void
}) {
  const widget: Widget = {
    id: comp.id,
    kind: (comp.type ?? 'bar') as Widget['kind'],
    title: comp.title,
    kpiType:
      comp.format === 'currency' ? 'currency' : comp.format === 'percent' ? 'percentage' : 'number',
    x: 0,
    y: 0,
    w: 6,
    h: 3,
    data: comp.rows
      ? {
          labels: comp.rows.map((r) => r.label),
          values: comp.rows.map((r) => r.value),
          rows: comp.rows,
        }
      : {
          labels: comp.labels ?? [],
          values: comp.values ?? [],
          kpiValue: comp.type === 'kpi' ? (comp.values?.[0] ?? 0) : undefined,
        },
  }

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-subtle transition-shadow hover:shadow-elevation">
      <div className="drag-handle flex cursor-move items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="truncate text-sm font-semibold text-[#172554]">{comp.title}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                onMove(comp.id, 'top')
              }}
            >
              Mover para o topo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(comp.id)}>
              <Copy className="mr-2 h-4 w-4" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onRemove(comp.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="min-h-0 flex-1">
        <WidgetRenderer widget={widget} />
      </div>
    </div>
  )
}
