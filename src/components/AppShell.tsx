// HARMOZA — shell principal: sidebar + header + integração do fluxo completo
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  Table2,
  Bot,
  UploadCloud,
  Settings,
  FileSpreadsheet,
  Sparkles,
  LogOut,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import type {
  AgentResult,
  ChatMessage,
  DashComponent,
  DashboardLayoutItem,
  Sheet,
  WorkBookState,
} from '@/lib/types'
import { parseWorkbook } from '@/lib/excel'
import { createDemoSheet } from '@/lib/demoData'
import { analyzeSheet, buildDashboard } from '@/lib/analyze'
import { fmtCurrency } from '@/lib/format'
import { HarmozaLogo } from './HarmozaLogo'
import { UploadArea } from './UploadArea'
import { SheetTabs } from './SheetTabs'
import { SheetTable } from './SheetTable'
import { DashboardGrid } from './DashboardGrid'
import { AgentPanel } from './AgentPanel'
import { LoadingState, DashboardGenerating } from './StateViews'

const LS_KEY = 'harmoza.state.v1'

type ViewMode = 'sheet' | 'dashboard'

interface Props {
  onLogout: () => void
}

export function AppShell({ onLogout }: Props) {
  const [workbook, setWorkbook] = useState<WorkBookState | null>(null)
  const [view, setView] = useState<ViewMode>('sheet')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [agentState, setAgentState] = useState<
    'idle' | 'listening' | 'processing' | 'executing' | 'done' | 'error'
  >('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as WorkBookState
        if (parsed.sheets && parsed.sheets.length > 0) setWorkbook(parsed)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const persist = useCallback((wb: WorkBookState | null) => {
    if (!wb) return
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(wb))
      setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      /* ignore */
    }
  }, [])

  const setWb = useCallback(
    (wb: WorkBookState | null) => {
      setWorkbook(wb)
      persist(wb)
    },
    [persist],
  )

  const activeSheet = useMemo(() => {
    if (!workbook) return null
    return (
      workbook.sheets.find((s) => s.id === workbook.activeSheetId) ?? workbook.sheets[0] ?? null
    )
  }, [workbook])

  // ---- Importação ----
  const handleLoaded = useCallback(
    (sheets: Sheet[], fileName: string) => {
      if (sheets.length === 0) {
        setImportError('Nenhuma aba encontrada neste arquivo.')
        return
      }
      const analysis = analyzeSheet(sheets[0])
      const { components, layout } = buildDashboard(sheets[0], analysis)
      setWb({
        fileName,
        sheets,
        activeSheetId: sheets[0].id,
        dashboard: components,
        layout,
        analysis,
      })
      setView('dashboard')
      setImportError(null)
    },
    [setWb],
  )

  const handleDemo = useCallback(() => {
    setImporting(true)
    setImportError(null)
    setTimeout(() => {
      const sheet = createDemoSheet()
      handleLoaded([sheet], 'Vendas 2025.xlsx')
      setImporting(false)
    }, 600)
  }, [handleLoaded])

  const handleUploadFile = useCallback(
    (wb: { fileName: string; sheets: Sheet[] }) => {
      if (wb.sheets.length === 0) {
        setImportError('O arquivo precisa ser um .xlsx válido.')
        return
      }
      handleLoaded(wb.sheets, wb.fileName)
    },
    [handleLoaded],
  )

  // ---- Abas ----
  const createSheet = useCallback(
    (name: string) => {
      if (!workbook) return
      const empty: Sheet = {
        id: `sheet-${Date.now()}`,
        name,
        columns: [],
        rows: [],
        columnTypes: {},
      }
      setWb({ ...workbook, sheets: [...workbook.sheets, empty], activeSheetId: empty.id })
    },
    [workbook, setWb],
  )

  const renameSheet = useCallback(
    (id: string, name: string) => {
      if (!workbook) return
      setWb({ ...workbook, sheets: workbook.sheets.map((s) => (s.id === id ? { ...s, name } : s)) })
    },
    [workbook, setWb],
  )

  const deleteSheet = useCallback(
    (id: string) => {
      if (!workbook) return
      const sheets = workbook.sheets.filter((s) => s.id !== id)
      if (sheets.length === 0) {
        setWb(null)
        localStorage.removeItem(LS_KEY)
        return
      }
      setWb({
        ...workbook,
        sheets,
        activeSheetId: workbook.activeSheetId === id ? sheets[0].id : workbook.activeSheetId,
      })
    },
    [workbook, setWb],
  )

  const updateSheet = useCallback(
    (sheet: Sheet) => {
      if (!workbook) return
      setWb({ ...workbook, sheets: workbook.sheets.map((s) => (s.id === sheet.id ? sheet : s)) })
    },
    [workbook, setWb],
  )

  // ---- Dashboard ----
  const removeComponent = useCallback(
    (id: string) => {
      if (!workbook) return
      setWb({
        ...workbook,
        dashboard: workbook.dashboard.filter((c) => c.id !== id),
        layout: workbook.layout.filter((l) => l.i !== id),
      })
    },
    [workbook, setWb],
  )

  const duplicateComponent = useCallback(
    (id: string) => {
      if (!workbook) return
      const comp = workbook.dashboard.find((c) => c.id === id)
      if (!comp) return
      const newId = `cmp-${Date.now()}`
      const copy: DashComponent = { ...comp, id: newId, title: `${comp.title} (cópia)` }
      const layoutItem = workbook.layout.find((l) => l.i === id)
      const maxY = workbook.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
      setWb({
        ...workbook,
        dashboard: [...workbook.dashboard, copy],
        layout: [
          ...workbook.layout,
          { i: newId, x: 0, y: maxY, w: layoutItem?.w ?? 6, h: layoutItem?.h ?? 3 },
        ],
      })
    },
    [workbook, setWb],
  )

  const moveComponent = useCallback(
    (id: string, pos: 'top' | 'bottom') => {
      if (!workbook) return
      const layout = [...workbook.layout]
      const idx = layout.findIndex((l) => l.i === id)
      if (idx < 0) return
      const item = layout.splice(idx, 1)[0]
      if (pos === 'top') {
        const minY = Math.min(...layout.map((l) => l.y))
        item.y = Math.max(0, minY - item.h)
        layout.unshift(item)
      } else {
        const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
        item.y = maxY
        layout.push(item)
      }
      setWb({ ...workbook, layout })
    },
    [workbook, setWb],
  )

  const addComponent = useCallback(() => {
    if (!workbook) return
    const comp: DashComponent = {
      id: `cmp-${Date.now()}`,
      type: 'bar',
      title: 'Novo componente',
      format: 'currency',
      labels: [],
      values: [],
    }
    const maxY = workbook.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
    setWb({
      ...workbook,
      dashboard: [...workbook.dashboard, comp],
      layout: [...workbook.layout, { i: comp.id, x: 0, y: maxY, w: 6, h: 3 }],
    })
  }, [workbook, setWb])

  // ---- Agente ----
  const buildAgentContext = useCallback((): { data: string; dash: string } => {
    if (!workbook || !activeSheet) return { data: '', dash: '' }
    const a = workbook.analysis
    const lines: string[] = []
    lines.push(`Arquivo: ${workbook.fileName}`)
    lines.push(`Aba ativa: ${activeSheet.name} (${activeSheet.rows.length} linhas)`)
    lines.push(`Colunas: ${activeSheet.columns.join(', ')}`)
    if (a) {
      if (a.totalRevenue !== undefined) lines.push(`Receita total: ${fmtCurrency(a.totalRevenue)}`)
      if (a.totalProfit !== undefined) lines.push(`Lucro total: ${fmtCurrency(a.totalProfit)}`)
      if (a.avgTicket !== undefined) lines.push(`Ticket médio: ${fmtCurrency(a.avgTicket)}`)
      if (a.orderCount !== undefined) lines.push(`Pedidos: ${a.orderCount}`)
      if (a.monthlyRevenue)
        lines.push(
          `Receita por mês: ${a.monthlyRevenue.map((m) => `${m.label} ${fmtCurrency(m.value)}`).join('; ')}`,
        )
      if (a.categoryRevenue)
        lines.push(
          `Por categoria: ${a.categoryRevenue.map((c) => `${c.label} ${fmtCurrency(c.value)}`).join('; ')}`,
        )
      if (a.topProducts)
        lines.push(
          `Top produtos: ${a.topProducts.map((p) => `${p.label} ${fmtCurrency(p.value)}`).join('; ')}`,
        )
      if (a.topClients)
        lines.push(
          `Top clientes: ${a.topClients.map((c) => `${c.label} ${fmtCurrency(c.value)}`).join('; ')}`,
        )
      if (a.regionRevenue)
        lines.push(
          `Por região: ${a.regionRevenue.map((r) => `${r.label} ${fmtCurrency(r.value)}`).join('; ')}`,
        )
      if (a.statusCounts)
        lines.push(`Status: ${a.statusCounts.map((s) => `${s.label} ${s.value}`).join('; ')}`)
    }
    return {
      data: lines.join('\n'),
      dash: workbook.dashboard.map((c) => `${c.type}:${c.title}`).join('\n'),
    }
  }, [workbook, activeSheet])

  const computeChartData = useCallback(
    (colX: string, colY: string, chartType: DashComponent['type']) => {
      if (!activeSheet)
        return {
          labels: [] as string[],
          values: [] as number[],
          rows: undefined as { label: string; value: number }[] | undefined,
        }
      const xi = activeSheet.columns.findIndex((c) => c.toLowerCase().includes(colX.toLowerCase()))
      const yi = activeSheet.columns.findIndex((c) => c.toLowerCase().includes(colY.toLowerCase()))
      if (xi >= 0 && yi >= 0) {
        const map = new Map<string, number>()
        for (const row of activeSheet.rows) {
          const k = String(row[xi] ?? 'Sem categoria')
          const v = Number(row[yi]) || 0
          map.set(k, (map.get(k) || 0) + v)
        }
        const entries = [...map.entries()].sort((a, b) => b[1] - a[1])
        return {
          labels: entries.map((e) => e[0]),
          values: entries.map((e) => e[1]),
          rows: entries.map((e) => ({ label: e[0], value: e[1] })),
        }
      }
      return { labels: [], values: [], rows: undefined }
    },
    [activeSheet],
  )

  const executeAgentAction = useCallback(
    (result: AgentResult): string => {
      switch (result.action) {
        case 'add_chart': {
          const title =
            typeof result.params.title === 'string' ? result.params.title : 'Novo gráfico'
          const chartType = (result.params.chartType as DashComponent['type']) || 'bar'
          const colX = typeof result.params.columnX === 'string' ? result.params.columnX : 'produto'
          const colY = typeof result.params.columnY === 'string' ? result.params.columnY : 'receita'
          const size = typeof result.params.size === 'string' ? result.params.size : 'medium'
          if (!workbook) return 'Sem dados para criar gráfico.'
          const data = computeChartData(colX, colY, chartType)
          const comp: DashComponent = {
            id: `cmp-${Date.now()}`,
            type: chartType,
            title,
            columnX: colX,
            columnY: colY,
            format: 'currency',
            labels: data.labels,
            values: data.values,
            rows: data.rows,
          }
          const maxY = workbook.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
          const w = size === 'large' ? 12 : size === 'small' ? 4 : 6
          setWb({
            ...workbook,
            dashboard: [...workbook.dashboard, comp],
            layout: [...workbook.layout, { i: comp.id, x: 0, y: maxY, w, h: 3 }],
          })
          return `Gráfico "${title}" criado no dashboard.`
        }
        case 'remove_component': {
          const title = typeof result.params.title === 'string' ? result.params.title : ''
          if (!workbook) return 'Sem dashboard.'
          const comp = workbook.dashboard.find((c) =>
            c.title.toLowerCase().includes(title.toLowerCase()),
          )
          if (!comp) return `Não encontrei um componente chamado "${title}".`
          setWb({
            ...workbook,
            dashboard: workbook.dashboard.filter((c) => c.id !== comp.id),
            layout: workbook.layout.filter((l) => l.i !== comp.id),
          })
          return `Removi o componente "${comp.title}".`
        }
        case 'move_component': {
          const title = typeof result.params.title === 'string' ? result.params.title : ''
          const pos = result.params.position === 'top' ? 'top' : 'bottom'
          if (!workbook) return 'Sem dashboard.'
          const comp = workbook.dashboard.find((c) =>
            c.title.toLowerCase().includes(title.toLowerCase()),
          )
          if (!comp) return `Não encontrei o componente "${title}".`
          moveComponent(comp.id, pos)
          return `Moví "${comp.title}" para ${pos === 'top' ? 'o topo' : 'a base'} do dashboard.`
        }
        case 'add_kpi': {
          const title = typeof result.params.title === 'string' ? result.params.title : 'Indicador'
          const colY = typeof result.params.column === 'string' ? result.params.column : 'receita'
          const format = (result.params.format as DashComponent['format']) || 'currency'
          if (!workbook || !activeSheet) return 'Sem dados.'
          const colIdx = activeSheet.columns.findIndex((c) =>
            c.toLowerCase().includes(colY.toLowerCase()),
          )
          let value = 0
          if (colIdx >= 0) {
            const agg = (result.params.aggregation as string) || 'sum'
            const nums = activeSheet.rows
              .map((r) => Number(r[colIdx]))
              .filter((n) => !Number.isNaN(n))
            value =
              agg === 'avg'
                ? nums.reduce((a, b) => a + b, 0) / Math.max(1, nums.length)
                : agg === 'count'
                  ? nums.length
                  : nums.reduce((a, b) => a + b, 0)
          }
          const comp: DashComponent = {
            id: `cmp-${Date.now()}`,
            type: 'kpi',
            title,
            columnY: colY,
            aggregation: (result.params.aggregation as DashComponent['aggregation']) || 'sum',
            format,
            labels: [title],
            values: [value],
          }
          const maxY = workbook.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
          setWb({
            ...workbook,
            dashboard: [...workbook.dashboard, comp],
            layout: [...workbook.layout, { i: comp.id, x: 0, y: maxY, w: 3, h: 2 }],
          })
          return `Adicionei o indicador "${title}".`
        }
        case 'create_sheet': {
          const name = typeof result.params.name === 'string' ? result.params.name : 'Nova aba'
          if (!workbook) return 'Sem planilha.'
          createSheet(name)
          return `Criei a nova aba "${name}".`
        }
        case 'filter':
          return 'Filtro de período aplicado (demonstração).'
        case 'answer':
        default:
          return result.reply
      }
    },
    [workbook, activeSheet, setWb, moveComponent, createSheet, computeChartData],
  )

  const handleAgentSend = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: Date.now(),
      }
      const nextMessages = [...messages, userMsg]
      setMessages(nextMessages)
      setAgentState('processing')
      try {
        const { data, dash } = buildAgentContext()
        const res = await pb.send('/backend/v1/harmoza/agent', {
          method: 'POST',
          body: JSON.stringify({
            messages: nextMessages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
            dataSummary: data,
            dashboardSummary: dash,
          }),
        })
        const result = res as AgentResult
        setAgentState('executing')
        const note = executeAgentAction(result)
        const replyText = result.action === 'answer' ? result.reply : `${result.reply} ${note}`
        setMessages([
          ...nextMessages,
          {
            id: `m-${Date.now() + 1}`,
            role: 'assistant',
            content: replyText,
            action: result.action !== 'answer' ? result.action : undefined,
            createdAt: Date.now(),
          },
        ])
        setAgentState('done')
      } catch {
        setAgentState('error')
        setMessages([
          ...nextMessages,
          {
            id: `m-${Date.now() + 2}`,
            role: 'assistant',
            content: 'Não consegui processar o pedido agora. Tente novamente.',
            createdAt: Date.now(),
          },
        ])
      }
    },
    [messages, buildAgentContext, executeAgentAction],
  )

  const generateDashboard = useCallback(() => {
    if (!workbook) return
    setGenerating(true)
    setTimeout(() => {
      const target = activeSheet ?? workbook.sheets[0]
      const a = analyzeSheet(target)
      const { components, layout } = buildDashboard(target, a)
      setWb({ ...workbook, dashboard: components, layout, analysis: a })
      setGenerating(false)
      setView('dashboard')
    }, 700)
  }, [workbook, activeSheet, setWb])

  const currentFileName = workbook?.fileName ?? 'Nenhum arquivo'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col bg-[#172554] text-white">
        <div className="px-4 py-5">
          <HarmozaLogo size={34} light />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <button
            onClick={() => setShowImport(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <UploadCloud className="h-4 w-4" /> Importar planilha
          </button>
          <button
            onClick={() => setView('sheet')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              view === 'sheet'
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Table2 className="h-4 w-4" /> Planilha
          </button>
          <button
            onClick={() => setView('dashboard')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              view === 'dashboard'
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>
          <button
            onClick={() => setAgentOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Bot className="h-4 w-4" /> Agente de IA
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Settings className="h-4 w-4" /> Configurações
          </button>
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F766E] text-xs font-bold">
              {pb.authStore.record?.name?.charAt(0)?.toUpperCase() || 'H'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {pb.authStore.record?.name || 'Usuário'}
              </p>
              <p className="truncate text-[10px] text-white/50">{pb.authStore.record?.email}</p>
            </div>
            <button
              onClick={onLogout}
              title="Sair"
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-[#0F766E]" />
              <span className="max-w-[220px] truncate font-semibold text-[#172554]">
                {currentFileName}
              </span>
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {activeSheet ? `Aba: ${activeSheet.name}` : 'Nenhuma aba'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {savedAt && (
              <span className="hidden items-center gap-1 text-xs text-muted-foreground md:inline">
                <Sparkles className="h-3 w-3 text-emerald-500" /> Salvo {savedAt}
              </span>
            )}
            <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
              <button
                onClick={() => setView('sheet')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === 'sheet'
                    ? 'bg-white text-[#172554] shadow-subtle'
                    : 'text-muted-foreground hover:text-[#172554]'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" /> Planilha
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === 'dashboard'
                    ? 'bg-white text-[#172554] shadow-subtle'
                    : 'text-muted-foreground hover:text-[#172554]'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </button>
            </div>
            <button
              onClick={() => setAgentOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#172554] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#172554]/90"
            >
              <Bot className="h-3.5 w-3.5" /> Agente
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {!workbook ? (
            <div className="mx-auto max-w-2xl px-6 py-10">
              <h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-[#172554]">
                Bem-vindo à HARMOZA 👋
              </h1>
              <UploadArea
                onLoaded={handleUploadFile}
                onDemo={handleDemo}
                loading={importing}
                error={importError}
                onDismissError={() => setImportError(null)}
              />
            </div>
          ) : importing ? (
            <LoadingState label="Importando planilha…" />
          ) : (
            <div className="px-4 py-4">
              {view === 'sheet' && activeSheet && (
                <>
                  <SheetTabs
                    sheets={workbook.sheets}
                    activeId={activeSheet.id}
                    onSelect={(id) => setWb({ ...workbook, activeSheetId: id })}
                    onCreate={createSheet}
                    onRename={renameSheet}
                    onDelete={deleteSheet}
                  />
                  <div className="mt-4">
                    <SheetTable sheet={activeSheet} onChange={updateSheet} />
                  </div>
                </>
              )}
              {view === 'dashboard' && (
                <div>
                  {generating ? (
                    <DashboardGenerating />
                  ) : (
                    <>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold tracking-tight text-[#172554]">
                            Dashboard
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Gerado automaticamente a partir de{' '}
                            <span className="font-medium text-[#172554]">{activeSheet?.name}</span>{' '}
                            — arraste, redimensione e personalize.
                          </p>
                        </div>
                        <button
                          onClick={generateDashboard}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F766E]/30 bg-[#0F766E]/5 px-3 py-2 text-xs font-semibold text-[#0F766E] hover:bg-[#0F766E]/10"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Regenerar dashboard
                        </button>
                      </div>
                      <DashboardGrid
                        components={workbook.dashboard}
                        layout={workbook.layout}
                        onLayoutChange={(layout) => setWb({ ...workbook, layout })}
                        onRemove={removeComponent}
                        onDuplicate={duplicateComponent}
                        onMove={moveComponent}
                        onAddComponent={addComponent}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showImport && workbook && (
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
            <UploadArea
              onLoaded={handleUploadFile}
              onDemo={() => {
                handleDemo()
                setShowImport(false)
              }}
              loading={importing}
              error={importError}
              onDismissError={() => setImportError(null)}
            />
          </div>
        </div>
      )}

      <AgentPanel
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        messages={messages}
        onSend={handleAgentSend}
        state={agentState}
        onStopListening={() => {
          /* o painel gerencia o reconhecimento */
        }}
      />
    </div>
  )
}
