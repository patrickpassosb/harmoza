/* HARMOZA — Dashboard (grade arrastável e redimensionável)
   react-grid-layout: mover, redimensionar, menu ⋮, duplicar, remover. */

import { useMemo, useState } from 'react'
import GridLayout, { type Layout } from 'react-grid-layout'
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

const COLS = 12
const ROW_H = 70
const MARGIN: [number, number] = [12, 12]

export function DashboardGrid({
  sheet,
  sheetIndex,
  dashboard,
  setDashboard,
}: {
  sheet: Sheet
  sheetIndex: number
  dashboard: DashboardState
  setDashboard: (d: DashboardState) => void
}) {
  const layout = useMemo<Layout[]>(
    () =>
      dashboard.widgets.map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: 2,
        minH: 1,
      })),
    [dashboard.widgets],
  )

  const handleLayoutChange = (next: Layout[]) => {
    const map = new Map(next.map((l) => [l.i, l]))
    setDashboard({
      widgets: dashboard.widgets.map((w) => {
        const l = map.get(w.id)
        return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w
      }),
    })
  }

  const removeWidget = (id: string) => {
    setDashboard({ widgets: dashboard.widgets.filter((w) => w.id !== id) })
  }

  const duplicateWidget = (id: string) => {
    const src = dashboard.widgets.find((w) => w.id === id)
    if (!src) return
    const copy: Widget = { ...src, id: 'widget-' + Date.now(), y: src.y + 1 }
    setDashboard({ widgets: [...dashboard.widgets, copy] })
  }

  const addWidget = (kind: Widget['kind'], title: string) => {
    const widget: Widget = {
      id: 'widget-' + Date.now(),
      kind,
      title,
      x: 0,
      y: dashboard.widgets.length,
      w: kind === 'pie' ? 4 : kind === 'kpi' ? 3 : 6,
      h: kind === 'kpi' ? 1 : 3,
    }
    setDashboard({ widgets: [...dashboard.widgets, widget] })
  }

  const regenerate = () => {
    const g = generateDashboard(sheet, sheetIndex)
    setDashboard(g)
  }

  if (dashboard.widgets.length === 0) {
    return (
      <EmptyState
        title="Nenhum componente no dashboard"
        description="Gere automaticamente os indicadores e gráficos com base nos dados da aba atual, ou adicione um componente manualmente."
        action={
          <div className="flex gap-2">
            <Button onClick={regenerate}>✨ Gerar dashboard automático</Button>
            <Button variant="outline" onClick={() => addWidget('bar', 'Novo gráfico de barras')}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Arraste para mover · arraste a borda para redimensionar · ⋮ para ações
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={regenerate}>
            ✨ Regenerar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" /> Componente
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => addWidget('kpi', 'Novo indicador')}>
                Indicador (KPI)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addWidget('bar', 'Novo gráfico de barras')}>
                Gráfico de barras
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addWidget('line', 'Novo gráfico de linhas')}>
                Gráfico de linhas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addWidget('pie', 'Novo gráfico de pizza')}>
                Gráfico de pizza
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addWidget('ranking', 'Novo ranking')}>
                Ranking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addWidget('table', 'Nova tabela')}>
                Tabela
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <GridLayout
        className="layout"
        layout={layout}
        cols={COLS}
        rowHeight={ROW_H}
        margin={MARGIN}
        containerPadding={[0, 0]}
        draggableHandle=".harmoza-drag-handle"
        isResizable
        onLayoutChange={handleLayoutChange}
      >
        {dashboard.widgets.map((w) => (
          <div
            key={w.id}
            className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="harmoza-drag-handle absolute left-0 top-0 flex h-8 w-full cursor-move items-center gap-1 border-b border-muted/50 bg-muted/30 px-2">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="flex-1 truncate text-xs font-semibold text-foreground">
                {w.title}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                    aria-label="Ações do componente"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => duplicateWidget(w.id)}>
                    <Copy className="h-4 w-4" /> Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => removeWidget(w.id)}>
                    <Trash2 className="h-4 w-4" /> Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="h-full pt-8">
              <WidgetRenderer widget={w} />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  )
}
