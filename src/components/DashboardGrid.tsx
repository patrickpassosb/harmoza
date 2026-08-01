// HARMOZA — grade modular arrastável e redimensionável do dashboard
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Plus } from 'lucide-react'
import type { DashComponent, DashboardLayoutItem } from '@/lib/types'
import { DashCard } from './DashCard'

const ResponsiveGrid = WidthProvider(Responsive)

interface Props {
  components: DashComponent[]
  layout: DashboardLayoutItem[]
  onLayoutChange: (layout: DashboardLayoutItem[]) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (id: string, pos: 'top' | 'bottom') => void
  onAddComponent: () => void
  generating?: boolean
}

export function DashboardGrid({
  components,
  layout,
  onLayoutChange,
  onRemove,
  onDuplicate,
  onMove,
  onAddComponent,
  generating,
}: Props) {
  if (generating) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#0F766E]/30 bg-white/50 text-center">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-[#0F766E]/10 text-[#0F766E]">
          <Plus className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-[#172554]">Gerando dashboard inteligente…</p>
      </div>
    )
  }

  if (components.length === 0) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-white/60 text-center">
        <p className="text-sm text-muted-foreground">Nenhum componente ainda.</p>
        <button
          onClick={onAddComponent}
          className="inline-flex items-center gap-2 rounded-xl bg-[#172554] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554]/90"
        >
          <Plus className="h-4 w-4" /> Adicionar componente
        </button>
      </div>
    )
  }

  const layoutForGrid: Layout[] = layout.map((l) => ({ ...l }))

  return (
    <div className="dashboard-grid-wrap">
      <ResponsiveGrid
        className="layout"
        layouts={{
          lg: layoutForGrid,
          md: layoutForGrid,
          sm: layoutForGrid,
          xs: layoutForGrid,
          xxs: layoutForGrid,
        }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={64}
        margin={[14, 14]}
        containerPadding={[0, 0]}
        draggableHandle=".drag-handle"
        onLayoutChange={(current: Layout[]) => {
          const next: DashboardLayoutItem[] = current.map((l) => ({
            i: l.i,
            x: l.x,
            y: l.y,
            w: l.w,
            h: l.h,
          }))
          onLayoutChange(next)
        }}
      >
        {components.map((comp) => (
          <div key={comp.id}>
            <DashCard comp={comp} onRemove={onRemove} onDuplicate={onDuplicate} onMove={onMove} />
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  )
}
