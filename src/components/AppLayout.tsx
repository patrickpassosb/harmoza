/* HARMOZA — Layout da aplicação (sidebar + header + conteúdo) */

import { useState, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Table2,
  Bot,
  Upload,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HarmozaLogo } from '@/components/Logo'
import { useApp } from '@/lib/AppContext'
import { cn } from '@/lib/utils'

type Section = 'home' | 'dashboard' | 'agent'

interface AppLayoutProps {
  section: Section
  onSection: (s: Section) => void
  onOpenAgent: () => void
  onImport: () => void
  children: ReactNode
}

export function AppLayout({ section, onSection, onOpenAgent, onImport, children }: AppLayoutProps) {
  const { state, dispatch } = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const hasData = state.sheets.some((s) => s.rows.length > 0)

  const navItems: { id: Section; label: string; icon: typeof Table2 }[] = [
    { id: 'home', label: 'Início', icon: FileSpreadsheet },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agent', label: 'Agente de IA', icon: Bot },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex shrink-0 flex-col bg-[#172554] text-white transition-all duration-200',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center border-b border-white/10 px-3',
            collapsed && 'justify-center px-0',
          )}
        >
          {!collapsed ? (
            <HarmozaLogo light />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
              H
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2 harmoza-scroll">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSection(item.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                section === item.id
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-0',
              )}
              title={item.label}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}

          {!collapsed && <div className="my-3 border-t border-white/10" />}

          {!collapsed && (
            <button
              onClick={onImport}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Upload className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">Importar planilha</span>
            </button>
          )}

          <button
            onClick={() => {
              window.location.href = '/settings'
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white',
              collapsed && 'justify-center px-0',
            )}
            title="Configurações"
          >
            <Settings className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span className="truncate">Configurações</span>}
          </button>
        </div>

        <div className="border-t border-white/10 p-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          {state.workbook ? (
            <div className="flex min-w-0 items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-semibold text-foreground">
                {state.workbook.name}
              </span>
              {state.sheets[state.activeSheetIndex] && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {state.sheets[state.activeSheetIndex].name}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Nenhuma planilha</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!state.saved && (
              <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 sm:inline">
                Alterações não salvas
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch({
                  type: 'SET_MODE',
                  mode: state.mode === 'dashboard' ? 'sheet' : 'dashboard',
                })
              }
              disabled={!hasData}
            >
              {state.mode === 'dashboard' ? (
                <>
                  <Table2 className="h-4 w-4" /> Planilha
                </>
              ) : (
                <>
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </>
              )}
            </Button>
            <Button size="sm" onClick={onOpenAgent} className="gap-1.5">
              <Bot className="h-4 w-4" /> Agente
            </Button>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 harmoza-scroll">{children}</main>
      </div>
    </div>
  )
}
