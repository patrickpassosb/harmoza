// HARMOZA — cabeçalho principal
import { Bot, Table2, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/ExportButton'
import { useHarmoza } from '@/lib/store'
import pb from '@/lib/pocketbase/client'

export function Header() {
  const {
    fileName,
    workbook,
    activeSheet,
    view,
    setView,
    setAgentOpen,
    importState,
    dashReady,
    runAutoDashboard,
  } = useHarmoza()
  const user = pb.authStore.record

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold text-foreground">
            {importState === 'success' && fileName ? fileName : 'HARMOZA'}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {workbook && activeSheet ? (
              <>
                <span className="text-[#0F766E]">●</span>
                Aba: {activeSheet.name} · {activeSheet.rows.length} linhas
              </>
            ) : (
              <span>Nenhuma planilha carregada</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {workbook && (
          <div className="flex items-center rounded-lg border border-border bg-muted p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 rounded-md px-3 ${view === 'sheet' ? 'bg-card text-foreground shadow-subtle' : 'text-muted-foreground'}`}
              onClick={() => setView('sheet')}
            >
              <Table2 className="h-3.5 w-3.5" /> Planilha
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 rounded-md px-3 ${view === 'dashboard' ? 'bg-card text-foreground shadow-subtle' : 'text-muted-foreground'}`}
              onClick={() => {
                if (!dashReady) runAutoDashboard()
                else setView('dashboard')
              }}
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Button>
          </div>
        )}
        <ExportButton />
        <Button className="gap-1.5" size="sm" onClick={() => setAgentOpen(true)}>
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">Agente</span>
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {(user?.name as string | undefined)?.charAt(0)?.toUpperCase() ?? 'H'}
        </div>
      </div>
    </header>
  )
}
