import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Upload,
  Bot,
  FileSpreadsheet,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { HarmozaLogo } from './Logo'
import { useHarmoza } from '@/lib/store'

interface SidebarProps {
  collapsed?: boolean
  mobileOpen?: boolean
  onCloseMobile?: () => void
  onToggleCollapsed?: () => void
}

export function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
  onToggleCollapsed,
}: SidebarProps) {
  const { importFile, workbooks, activeWorkbookId, switchWorkbook, deleteWorkbook } = useHarmoza()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; fileName: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    const result = await deleteWorkbook(deleteTarget.id)
    setIsDeleting(false)
    if (!result.error) setDeleteTarget(null)
  }

  const go = (path: string) => {
    navigate(path)
    onCloseMobile?.()
  }
  const selectWb = (id: string) => {
    switchWorkbook(id)
    navigate('/')
    onCloseMobile?.()
  }

  const renderHeader = (compact: boolean) => (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-white/10 px-5 py-6',
        compact && 'justify-center px-3',
      )}
    >
      {compact ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
          H
        </div>
      ) : (
        <>
          <HarmozaLogo size={42} />
          <span className="text-2xl font-black tracking-wider text-white">HARMOZA</span>
        </>
      )}
    </div>
  )

  const renderNav = (compact: boolean) => (
    <nav className="mt-4 flex flex-col gap-1 px-3">
      <button
        onClick={() => go('/agente')}
        title={compact ? 'Agente de IA' : undefined}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
          compact && 'justify-center',
          location.pathname === '/agente'
            ? 'bg-white/15 text-white font-semibold'
            : 'text-white/70 hover:bg-white/10 hover:text-white',
        )}
      >
        <Bot className="h-4 w-4 shrink-0" />
        {!compact && <span>Agente de IA</span>}
      </button>
    </nav>
  )

  const renderBody = (compact: boolean) => (
    <div className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
      {!compact && (
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Meus arquivos
        </p>
      )}
      <div className="flex flex-col gap-1">
        {workbooks.length === 0 && !compact && (
          <p className="px-3 py-2 text-xs text-white/40">Nenhum arquivo carregado</p>
        )}
        {workbooks.map((wb) => {
          const isActive = wb.id === activeWorkbookId
          const isDemo = wb.id === 'demo-workbook'
          const displayName = isDemo ? 'Demonstração' : wb.fileName
          return (
            <div
              key={wb.id}
              className={cn(
                'group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors',
                compact && 'justify-center',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <button
                onClick={() => selectWb(wb.id)}
                title={compact ? displayName : undefined}
                className={cn('flex min-w-0 items-center gap-2 text-left', !compact && 'flex-1')}
              >
                <FileSpreadsheet
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive ? 'text-emerald-300' : 'text-white/50',
                  )}
                />
                {!compact && <span className="truncate text-xs">{displayName}</span>}
              </button>
              {!compact && (
                <button
                  onClick={() => setDeleteTarget({ id: wb.id, fileName: displayName })}
                  disabled={isDeleting}
                  aria-label="Excluir arquivo"
                  className="shrink-0 rounded p-1 text-white/40 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div
        className={cn(
          'mt-3 border-t border-white/10 pt-3 flex flex-col gap-2',
          compact && 'items-center',
        )}
      >
        <Button
          className={cn(
            'justify-start gap-2 bg-white/10 text-white hover:bg-white/20 text-xs font-medium',
            compact ? 'h-9 w-9 p-0' : 'w-full',
          )}
          onClick={() => inputRef.current?.click()}
          title={compact ? 'Importar planilha' : undefined}
        >
          <Upload className="h-4 w-4" />
          {!compact && 'Importar planilha'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              void importFile(f)
              navigate('/')
              onCloseMobile?.()
            }
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )

  const renderToggle = () =>
    onToggleCollapsed && (
      <div className="hidden border-t border-white/10 p-2 md:block">
        <button
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expandir' : 'Recolher'}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    )

  return (
    <>
      <aside
        className={cn(
          'hidden h-screen shrink-0 flex-col bg-[#172554] text-white transition-all duration-200 md:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {renderHeader(collapsed)}
        {renderNav(collapsed)}
        {renderBody(collapsed)}
        {renderToggle()}
      </aside>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 animate-fade-in bg-black/50 md:hidden"
            onClick={onCloseMobile}
          />
          <aside className="fixed left-0 top-0 z-50 flex h-full w-60 animate-fade-in flex-col bg-[#172554] text-white md:hidden">
            <button
              onClick={onCloseMobile}
              aria-label="Fechar menu"
              className="absolute right-3 top-5 z-10 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {renderHeader(false)}
            {renderNav(false)}
            {renderBody(false)}
          </aside>
        </>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir arquivo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{' '}
            <span className="font-semibold text-foreground">"{deleteTarget?.fileName}"</span>? Esta
            ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
