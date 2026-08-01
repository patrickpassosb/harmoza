import { useRef } from 'react'
import { Upload, Table2, LayoutDashboard, Bot, FileSpreadsheet, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HarmozaLogo, HarmozaWordmark } from './Logo'
import { useHarmoza } from '@/lib/store'
import { useNavigate } from 'react-router-dom'

export function Sidebar() {
  const {
    view,
    setView,
    importFile,
    loadDemo,
    workbooks,
    activeWorkbookId,
    switchWorkbook,
    setAgentOpen,
  } = useHarmoza()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const navItems = [
    { key: 'sheet' as const, label: 'Planilha', icon: Table2 },
    { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  ]

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-[#172554] text-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <HarmozaLogo size={34} />
        <HarmozaWordmark size="md" />
      </div>

      <div className="px-3">
        <Button
          className="w-full justify-start gap-2 bg-white/10 text-white hover:bg-white/20"
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

      <nav className="mt-6 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => {
                setView(item.key)
                navigate('/')
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          )
        })}
        <button
          onClick={() => setAgentOpen(true)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bot className="h-4 w-4" /> Agente de IA
        </button>
      </nav>

      <div className="mt-6 flex-1 overflow-y-auto px-3 pb-3">
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
            return (
              <button
                key={wb.id}
                onClick={() => {
                  switchWorkbook(wb.id)
                  navigate('/')
                }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FileSpreadsheet
                  className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-300' : 'text-white/50'}`}
                />
                <span className="truncate text-xs">{isDemo ? 'Demonstração' : wb.fileName}</span>
              </button>
            )
          })}
        </div>
        <button
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/60 transition-colors hover:text-white"
          onClick={() => {
            void loadDemo()
            navigate('/')
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Carregar demonstração
        </button>
      </div>
    </aside>
  )
}
