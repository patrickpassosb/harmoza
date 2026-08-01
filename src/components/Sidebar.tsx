// HARMOZA — barra lateral (logo, importar, navegação, arquivos recentes)
import { useRef } from 'react'
import {
  Upload,
  Table2,
  LayoutDashboard,
  Bot,
  Settings,
  LogOut,
  FileSpreadsheet,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HarmozaLogo, HarmozaWordmark } from './Logo'
import { useHarmoza } from '@/lib/store'
import pb from '@/lib/pocketbase/client'

export function Sidebar() {
  const { view, setView, importState, importFile, loadDemo, fileName, setAgentOpen, reset } =
    useHarmoza()
  const inputRef = useRef<HTMLInputElement>(null)

  const navItems = [
    { key: 'sheet' as const, label: 'Planilha', icon: Table2 },
    { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  ]

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <HarmozaLogo size={34} />
        <HarmozaWordmark dark size="md" />
      </div>

      {/* Importar */}
      <div className="px-3">
        <Button
          className="w-full justify-start gap-2 bg-white/10 text-white hover:bg-white/20"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Importar planilha
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
        />
      </div>

      {/* Navegação */}
      <nav className="mt-6 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
        <button
          onClick={() => setAgentOpen(true)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <Bot className="h-4 w-4" />
          Agente de IA
        </button>
        <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
          <Settings className="h-4 w-4" />
          Configurações
        </button>
      </nav>

      {/* Arquivos recentes */}
      {importState === 'success' && fileName && (
        <div className="mt-6 px-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Arquivo atual
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-300" />
            <span className="truncate text-xs text-sidebar-foreground/90">{fileName}</span>
          </div>
          <button
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
            onClick={loadDemo}
          >
            <Plus className="h-3.5 w-3.5" />
            Carregar demonstração
          </button>
        </div>
      )}

      <div className="mt-auto px-3 pb-4">
        <button
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          onClick={async () => {
            pb.authStore.clear()
            reset()
          }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
