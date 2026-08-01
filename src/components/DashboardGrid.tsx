// HARMOZA — grade modular arrastável e redimensionável do dashboard
// Interface compatível com Index.tsx: (sheet, sheetIndex, dashboard, setDashboard)
import { useState } from 'react'
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { MoreVertical, Copy, Trash2, Plus, GripVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { WidgetRenderer } from '@/components/WidgetRenderer'
import { EmptyState } from '@/components/EmptyState'
import { generateDashboard, type DashboardState, type Sheet, type Widget } from '@/lib/harmoza'

const ResponsiveGrid = WidthProvider(Responsive)

interface Props {
  sheet: Sheet
  sheetIndex: number
  dashboard: DashboardState
  setDashboard: (d: DashboardState) => void
}

export function DashboardGrid({ sheet, sheetIndex, dashboard, setDashboard }: Props) {
  const [dragging, setDragging] = useState(false)

  const widgets = dashboard.widgets

  const handleLayoutChange = (current: Layout[]) => {
    const next = current.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
    setDashboard({
      widgets: widgets.map((w) => {
        const pos = next.find((n) => n.i === w.id)
        return pos ? { ...w, x: pos.x, y: pos.y, w: pos.w, h: pos.h } : w
      }),
    })
  }

  const removeWidget = (id: string) => {
    setDashboard({ widgets: widgets.filter((w) => w.id !== id) })
  }

  const duplicateWidget = (id: string) => {
    const w = widgets.find((x) => x.id === id)
    if (!w) return
    const copy: Widget = {
      ...w,
      id: 'widget-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title: w.title + ' (cópia)',
      y: 99,
    }
    setDashboard({ widgets: [...widgets, copy] })
  }

  const addWidget = () => {
    const generated = generateDashboard(sheet, sheetIndex)
    const w = generated.widgets[0]
    if (!w) return
    const copy: Widget = { ...w, id: 'widget-' + Date.now(), y: 99 }
    setDashboard({ widgets: [...widgets, copy] })
  }

  if (widgets.length === 0) {
    return (
      <EmptyState
        icon={<Plus className="h-7 w-7" />}
        title="Nenhum componente ainda"
        description="Gere o dashboard automático ou adicione um componente manualmente."
        action={
          <Button onClick={addWidget}>
            <Plus className="h-4 w-4" /> Adicionar componente
          </Button>
        }
      />
    )
  }

  const layoutForGrid: Layout[] = widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: 2,
    minH: 1,
  }))

  return (
    <div className={dragging ? 'cursor-grabbing' : ''}>
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
        onLayoutChange={handleLayoutChange}
        onDragStart={() => setDragging(true)}
        onDragStop={() => setDragging(false)}
        onResizeStart={() => setDragging(true)}
        onResizeStop={() => setDragging(false)}
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            className="group relative overflow-hidden rounded-2xl border border-border bg-white shadow-subtle transition-shadow hover:shadow-elevation"
          >
            {/* Header arrastável */}
            <div className="drag-handle flex cursor-move items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-3 py-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                <span className="truncate text-sm font-semibold text-[#172554]">{w.title}</span>
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
                  <DropdownMenuItem onClick={() => duplicateWidget(w.id)}>
                    <Copy className="mr-2 h-4 w-4" /> Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => removeWidget(w.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Corpo */}
            <div className="h-[calc(100%-41px)]">
              <WidgetRenderer widget={w} />
            </div>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  )
}
