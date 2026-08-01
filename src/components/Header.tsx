// HARMOZA — cabeçalho principal
import { Table2, LayoutDashboard, Settings, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/ExportButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHarmoza } from '@/lib/store'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const {
    fileName,
    workbook,
    activeSheet,
    view,
    setView,
    importState,
    dashReady,
    runAutoDashboard,
  } = useHarmoza()
  const user = pb.authStore.record
  const navigate = useNavigate()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-3 md:px-5">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {onMenuClick && (
          <button
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
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
          <div className="hidden items-center rounded-lg border border-border bg-muted p-0.5 sm:flex">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 rounded-md px-3 ${view === 'sheet' ? 'bg-card text-foreground shadow-subtle' : 'text-muted-foreground'}`}
              onClick={() => {
                setView('sheet')
                navigate('/')
              }}
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
                navigate('/')
              }}
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Button>
          </div>
        )}
        <ExportButton />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-opacity hover:opacity-80">
              {(user?.name as string | undefined)?.charAt(0)?.toUpperCase() ?? 'H'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {(user?.name as string) || 'Usuário'}
              </span>
              <span className="text-xs text-muted-foreground">{(user?.email as string) || ''}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
              onClick={() => {
                pb.authStore.clear()
                window.location.reload()
              }}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
