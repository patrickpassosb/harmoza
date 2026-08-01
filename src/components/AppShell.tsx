import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SheetTabs } from './SheetTabs'
import { SheetTable } from './SheetTable'
import { DashGrid } from './DashGrid'
import { AgentPanel, AgentFab } from './AgentPanel'
import { ExcelUpload } from './ExcelUpload'
import { LoadingState } from './StateViews'
import { SettingsView } from './SettingsView'
import { useHarmoza } from '@/lib/store'
import { useNavigate } from 'react-router-dom'

export function AppShell({ initialView }: { initialView?: 'sheet' | 'dashboard' | 'settings' }) {
  const {
    workbook,
    importState,
    importError,
    warnings,
    activeSheet,
    view,
    setView,
    setActiveSheet,
    createSheet,
    renameSheet,
    deleteSheet,
    updateSheet,
    importFile,
    loadDemo,
    dashReady,
    runAutoDashboard,
  } = useHarmoza()
  const [showImport, setShowImport] = useState(false)
  const navigate = useNavigate()

  if (initialView === 'settings') {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <SettingsView onBack={() => navigate('/')} />
          </main>
        </div>
        <AgentPanel />
        <AgentFab />
      </div>
    )
  }

  if (!workbook) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-6 py-10">
              <h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-[#172554]">
                Bem-vindo à HARMOZA 👋
              </h1>
              {importState === 'loading' ? (
                <LoadingState />
              ) : (
                <ExcelUpload
                  onDemo={loadDemo}
                  loading={importState === 'loading'}
                  error={importError}
                  onDismissError={() => undefined}
                />
              )}
            </div>
          </main>
        </div>
        <AgentPanel />
        <AgentFab />
      </div>
    )
  }
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        {warnings.length > 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-700">
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {view === 'sheet' && activeSheet && (
            <div className="px-5 py-4">
              <SheetTabs
                sheets={workbook.sheets}
                activeId={activeSheet.id}
                onSelect={setActiveSheet}
                onCreate={createSheet}
                onRename={renameSheet}
                onDelete={deleteSheet}
              />
              <div className="mt-4">
                <SheetTable sheet={activeSheet} onChange={updateSheet} />
              </div>
            </div>
          )}
          {view === 'dashboard' && (
            <div className="px-5 py-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-[#172554]">Dashboard</h2>
                  <p className="text-xs text-muted-foreground">
                    Gerado automaticamente a partir de{' '}
                    <span className="font-medium text-[#172554]">{activeSheet?.name}</span> —
                    arraste, redimensione e personalize.
                  </p>
                </div>
                <button
                  onClick={runAutoDashboard}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F766E]/30 bg-[#0F766E]/5 px-3 py-2 text-xs font-semibold text-[#0F766E] hover:bg-[#0F766E]/10"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Regenerar dashboard
                </button>
              </div>
              <DashGrid />
            </div>
          )}
        </main>
      </div>
      {showImport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowImport(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#172554]">Importar nova planilha</h3>
              <button
                onClick={() => setShowImport(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>
            <ExcelUpload
              onSuccessClose={() => setShowImport(false)}
              onDemo={() => {
                loadDemo()
                setShowImport(false)
              }}
              loading={importState === 'loading'}
              error={importError}
              onDismissError={() => undefined}
            />
          </div>
        </div>
      )}
      <AgentPanel />
      <AgentFab />
    </div>
  )
}
