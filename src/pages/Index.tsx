/* HARMOZA — Página principal
   Fluxo completo: importar → abas → dashboard → agente. */

import { useCallback, useEffect, useState } from 'react'
import { Bot, Sparkles, LayoutDashboard, UploadCloud } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { UploadPanel } from '@/components/UploadPanel'
import { SheetTable } from '@/components/SheetTable'
import { DashboardGrid } from '@/components/DashboardGrid'
import { AgentPanel } from '@/components/AgentPanel'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/AppContext'
import { generateDashboard, type Sheet } from '@/lib/harmoza'
import { buildDemoWorkbook } from '@/services/demoData'
import { fetchDemoWorkbook } from '@/services/harmoza'

type Section = 'home' | 'dashboard' | 'agent'

export default function Index() {
  const { state, dispatch } = useApp()
  const [section, setSection] = useState<Section>('home')
  const [demoLoading, setDemoLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const hasData = state.sheets.some((s) => s.rows.length > 0)
  const activeSheet = state.sheets[state.activeSheetIndex]

  // Regenera dashboard quando a aba ativa muda (se ainda não tiver widgets)
  useEffect(() => {
    if (activeSheet && state.dashboard.widgets.length === 0 && section === 'dashboard') {
      setGenerating(true)
      const t = setTimeout(() => {
        dispatch({
          type: 'SET_DASHBOARD',
          dashboard: generateDashboard(activeSheet, state.activeSheetIndex),
        })
        setGenerating(false)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [activeSheet, section, state.dashboard.widgets.length, dispatch, state.activeSheetIndex])

  const handleImported = useCallback(
    (sheets: Sheet[], fileName: string) => {
      const wb = {
        id: 'wb-' + Date.now(),
        name: fileName.replace(/\.xlsx?$/i, '') || 'Planilha importada',
        fileName,
        sheets,
      }
      dispatch({ type: 'SET_WORKBOOK', workbook: wb })
      // gera dashboard imediatamente (dashboard sendo gerado → pronto)
      const active = sheets[0]
      if (active) {
        dispatch({ type: 'SET_DASHBOARD', dashboard: generateDashboard(active, 0) })
      }
      setSection('home')
    },
    [dispatch],
  )

  const handleLoadDemo = useCallback(async () => {
    setDemoLoading(true)
    try {
      let wb = buildDemoWorkbook()
      try {
        const remote = await fetchDemoWorkbook()
        if (remote?.workbook) wb = remote.workbook
      } catch {
        // offline/backend indisponível — usa a demo local
      }
      dispatch({ type: 'SET_WORKBOOK', workbook: wb })
      if (wb.sheets[0]) {
        dispatch({ type: 'SET_DASHBOARD', dashboard: generateDashboard(wb.sheets[0], 0) })
      }
      setSection('home')
    } finally {
      setDemoLoading(false)
    }
  }, [dispatch])

  const updateSheets = useCallback(
    (s: Sheet[]) => {
      dispatch({ type: 'SET_SHEETS', sheets: s })
    },
    [dispatch],
  )

  const openAgent = useCallback(() => dispatch({ type: 'SET_AGENT_OPEN', open: true }), [dispatch])

  return (
    <>
      <AppLayout
        section={section}
        onSection={(s) => setSection(s)}
        onOpenAgent={openAgent}
        onImport={() => setSection('home')}
      >
        {/* HOME — importação / abas */}
        {section === 'home' && (
          <div className="mx-auto max-w-5xl">
            {!state.workbook ? (
              <UploadPanel
                onImported={handleImported}
                onLoadDemo={handleLoadDemo}
                demoLoading={demoLoading}
              />
            ) : (
              <div className="animate-fade-in">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      {state.workbook.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {state.sheets.length} aba(s) · edite livremente — as mudanças ficam na sessão
                    </p>
                  </div>
                </div>
                <SheetTable
                  sheets={state.sheets}
                  activeIndex={state.activeSheetIndex}
                  setActiveIndex={(i) => dispatch({ type: 'SET_ACTIVE_SHEET', index: i })}
                  updateSheets={updateSheets}
                />
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setSection('dashboard')} disabled={!hasData}>
                    <LayoutDashboard className="h-4 w-4" /> Ver dashboard
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DASHBOARD */}
        {section === 'dashboard' && (
          <div className="mx-auto max-w-7xl">
            {!hasData ? (
              <EmptyState
                icon={<LayoutDashboard className="h-7 w-7" />}
                title="Nenhum dado para analisar"
                description="Importe uma planilha ou carregue a demonstração para gerar o dashboard automático."
                action={
                  <Button onClick={() => setSection('home')}>
                    <UploadCloud className="h-4 w-4" /> Importar planilha
                  </Button>
                }
              />
            ) : generating && state.dashboard.widgets.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-7 w-7 animate-pulse text-[#D97706]" />}
                title="Gerando dashboard…"
                description="Analisando as colunas e criando os indicadores e gráficos relevantes."
              />
            ) : activeSheet ? (
              <DashboardGrid
                sheet={activeSheet}
                sheetIndex={state.activeSheetIndex}
                dashboard={state.dashboard}
                setDashboard={(d) => dispatch({ type: 'SET_DASHBOARD', dashboard: d })}
              />
            ) : null}
          </div>
        )}

        {/* AGENT — seção (painel lateral é sobreposto) */}
        {section === 'agent' && (
          <div className="mx-auto max-w-3xl">
            <EmptyState
              icon={<Bot className="h-7 w-7" />}
              title="Agente de IA"
              description="Fale ou digite um comando e o agente consulta seus dados, cria gráficos e organiza o dashboard."
              action={
                <Button onClick={openAgent}>
                  <Bot className="h-4 w-4" /> Abrir agente
                </Button>
              }
            />
          </div>
        )}
      </AppLayout>

      {/* Painel do agente (sobreposto) */}
      <AgentPanel
        open={state.agentOpen}
        onClose={() => dispatch({ type: 'SET_AGENT_OPEN', open: false })}
      />

      {/* Botão flutuante do agente */}
      {!state.agentOpen && (
        <button
          onClick={openAgent}
          className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-elevation transition-transform hover:scale-105"
          aria-label="Abrir agente de IA"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}
    </>
  )
}
