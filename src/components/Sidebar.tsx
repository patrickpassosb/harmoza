import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Bot, FileSpreadsheet, Trash2, Loader2 } from 'lucide-react'
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

export function Sidebar() {
  const { importFile, workbooks, activeWorkbookId, switchWorkbook, setAgentOpen, deleteWorkbook } =
    useHarmoza()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; fileName: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    const result = await deleteWorkbook(deleteTarget.id)
    setIsDeleting(false)
    if (!result.error) setDeleteTarget(null)
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-[#172554] text-white">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <HarmozaLogo size={42} />
        <span className="text-2xl font-black tracking-wider text-white">HARMOZA</span>
      </div>

      <nav className="mt-4 flex flex-col gap-1 px-3">
        <button
          onClick={() => setAgentOpen(true)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bot className="h-4 w-4" /> Agente de IA
        </button>
      </nav>

      <div className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Meus arquivos
        </p>
        <div className="flex flex-col gap-1">
          {workbooks.length === 0 && (
            <p className="px-3 py-2 text-xs text-white/40">Nenhum arquivo carregado</p>
          )}
          {workbooks.map((wb) => {
            const isActive = wb.id === activeWorkbookId
            const isDemo = wb.id === 'demo-workbook'
            const displayName = isDemo ? 'Demonstração' : wb.fileName
            return (
              <div
                key={wb.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <button
                  onClick={() => {
                    switchWorkbook(wb.id)
                    navigate('/')
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <FileSpreadsheet
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-300' : 'text-white/50'}`}
                  />
                  <span className="truncate text-xs">{displayName}</span>
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: wb.id, fileName: displayName })}
                  disabled={isDeleting}
                  aria-label="Excluir arquivo"
                  className="shrink-0 rounded p-1 text-white/40 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
          <Button
            className="w-full justify-start gap-2 bg-white/10 text-white hover:bg-white/20 text-xs font-medium"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Importar planilha
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
              }
              e.target.value = ''
            }}
          />
        </div>
      </div>

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
    </aside>
  )
}
