import { useState } from 'react'
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { MoreVertical, Trash2, Copy, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DashCardBody } from './DashCard'
import { useHarmoza } from '@/lib/store'
import { cn } from '@/lib/utils'

const Grid = WidthProvider(GridLayout)

export function DashGrid(_props?: any) {
  const {
    components,
    layout,
    moveComponent,
    removeComponent,
    duplicateComponent,
    dashReady,
    isGeneratingDash,
    selectedComponentId,
    setSelectedComponent,
  } = useHarmoza()
  const [dragging, setDragging] = useState(false)

  if (isGeneratingDash) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-16 text-center animate-fade-in">
        <p className="font-semibold text-foreground">Gerando seu dashboard…</p>
        <p className="text-sm text-muted-foreground">
          Analisando colunas e criando os gráficos mais relevantes
        </p>
      </div>
    )
  }

  if (!dashReady || components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/25 bg-card/50 p-16 text-center">
        <p className="text-lg font-semibold text-foreground">Dashboard ainda não gerado</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Depois de importar sua planilha, gere o dashboard automático para ver os indicadores e
          gráficos da sua empresa.
        </p>
      </div>
    )
  }

  return (
    <div className={dragging ? 'cursor-grabbing' : ''}>
      <Grid
        className="layout"
        layout={layout.map((l) => ({ ...l, minW: 2, minH: 2 }))}
        cols={12}
        rowHeight={44}
        margin={[14, 14]}
        containerPadding={[0, 0]}
        draggableHandle=".dash-drag-handle"
        onLayoutChange={(next) => moveComponent(next as typeof layout)}
        onDragStart={() => setDragging(true)}
        onDragStop={() => setDragging(false)}
        onResizeStart={() => setDragging(true)}
        onResizeStop={() => setDragging(false)}
      >
        {components.map((comp) => (
          <div
            key={comp.id}
            className={cn(
              'group relative overflow-hidden rounded-2xl border bg-card shadow-subtle transition-shadow hover:shadow-elevation',
              selectedComponentId === comp.id
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border',
            )}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedComponent(selectedComponentId === comp.id ? null : comp.id)
            }}
          >
            <div className="dash-drag-handle flex cursor-move items-center justify-between gap-2 border-b border-border/70 bg-muted/30 px-3 py-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <span className="truncate text-sm font-semibold text-foreground">{comp.title}</span>
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
                  <DropdownMenuItem onClick={() => duplicateComponent(comp.id)}>
                    <Copy className="mr-2 h-4 w-4" /> Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => removeComponent(comp.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="h-[calc(100%-40px)]">
              <DashCardBody comp={comp} />
            </div>
          </div>
        ))}
      </Grid>
    </div>
  )
}
