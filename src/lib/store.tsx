// HARMOZA — estado global da aplicação (context + localStorage)
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  AgentMessage,
  AgentStatus,
  DashComponent,
  DashLayoutItem,
  ImportState,
  SheetData,
  ViewMode,
  Workbook,
} from './types'
import { generateDashboard } from './dashboard'
import { demoWorkbook } from './demo'
import { parseExcelFile } from './excel'
import pb from './pocketbase/client'

const LS_KEY = 'harmoza-state-v1'

interface PersistedState {
  workbook: Workbook | null
  view: ViewMode
  components: DashComponent[]
  layout: DashLayoutItem[]
  fileName: string
}

interface HarmozaCtx {
  // workbook
  workbook: Workbook | null
  fileName: string
  importState: ImportState
  importError: string
  warnings: string[]
  activeSheet: SheetData | null
  // view
  view: ViewMode
  setView: (v: ViewMode) => void
  // sheet ops
  setActiveSheet: (id: string) => void
  createSheet: (name: string, fromSheetId?: string) => void
  renameSheet: (id: string, name: string) => void
  deleteSheet: (id: string) => void
  setCell: (sheetId: string, rowIdx: number, colIdx: number, value: string | number | null) => void
  addRow: () => void
  addColumn: (name: string) => void
  // import
  importFile: (file: File) => Promise<void>
  loadDemo: () => void
  reset: () => void
  // dashboard
  components: DashComponent[]
  layout: DashLayoutItem[]
  dashReady: boolean
  isGeneratingDash: boolean
  runAutoDashboard: () => void
  addComponent: (c: Omit<DashComponent, 'id'>) => void
  removeComponent: (id: string) => void
  duplicateComponent: (id: string) => void
  moveComponent: (layout: DashLayoutItem[]) => void
  // agente
  agentOpen: boolean
  setAgentOpen: (v: boolean) => void
  agentMessages: AgentMessage[]
  agentStatus: AgentStatus
  sendAgentText: (text: string) => Promise<void>
  clearAgent: () => void
  speak: (text: string) => void
}

const Ctx = createContext<HarmozaCtx | null>(null)

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as PersistedState
    if (!p.workbook || !Array.isArray(p.workbook.sheets)) return null
    return p
  } catch {
    return null
  }
}

const uid = () => Math.random().toString(36).slice(2, 10)

export function HarmozaProvider({ children }: { children: ReactNode }) {
  const [persisted] = useState(loadPersisted)

  const [workbook, setWorkbook] = useState<Workbook | null>(persisted?.workbook ?? null)
  const [fileName, setFileName] = useState(persisted?.fileName ?? '')
  const [importState, setImportState] = useState<ImportState>(
    persisted?.workbook ? 'success' : 'idle',
  )
  const [importError, setImportError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [view, setView] = useState<ViewMode>(persisted?.view ?? 'sheet')
  const [components, setComponents] = useState<DashComponent[]>(persisted?.components ?? [])
  const [layout, setLayout] = useState<DashLayoutItem[]>(persisted?.layout ?? [])
  const [dashReady, setDashReady] = useState(false)
  const [isGeneratingDash, setIsGeneratingDash] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([])
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')

  const lastWorkbookRef = useRef<Workbook | null>(workbook)
  lastWorkbookRef.current = workbook

  // Persistência (sessão)
  useEffect(() => {
    if (!workbook) return
    const state: PersistedState = { workbook, view, components, layout, fileName }
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  }, [workbook, view, components, layout, fileName])

  const activeSheet = useMemo(() => {
    if (!workbook) return null
    return (
      workbook.sheets.find((s) => s.id === workbook.activeSheetId) ?? workbook.sheets[0] ?? null
    )
  }, [workbook])

  // ---------- Import ----------
  const importFile = useCallback(async (file: File) => {
    setImportState('loading')
    setImportError('')
    setWarnings([])
    try {
      const res = await parseExcelFile(file)
      setWorkbook(res.workbook)
      setFileName(res.workbook.fileName)
      setWarnings(res.warnings)
      setImportState('success')
      setView('sheet')
      setComponents([])
      setLayout([])
      setDashReady(false)
    } catch (err) {
      setImportState('error')
      setImportError(err instanceof Error ? err.message : 'Não foi possível processar o arquivo.')
      setWorkbook(null)
    }
  }, [])

  const loadDemo = useCallback(() => {
    const wb = demoWorkbook()
    setWorkbook(wb)
    setFileName(wb.fileName)
    setImportState('success')
    setImportError('')
    setWarnings([])
    setView('sheet')
    setComponents([])
    setLayout([])
    setDashReady(false)
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    setWorkbook(null)
    setFileName('')
    setImportState('idle')
    setImportError('')
    setWarnings([])
    setView('sheet')
    setComponents([])
    setLayout([])
    setDashReady(false)
    setAgentMessages([])
    setAgentOpen(false)
  }, [])

  // ---------- Sheets ----------
  const setActiveSheet = useCallback((id: string) => {
    setWorkbook((w) => {
      if (!w) return w
      if (!w.sheets.some((s) => s.id === id)) return w
      return { ...w, activeSheetId: id }
    })
  }, [])

  const createSheet = useCallback((name: string, fromSheetId?: string) => {
    setWorkbook((w) => {
      if (!w) return w
      const base = fromSheetId ? w.sheets.find((s) => s.id === fromSheetId) : null
      const newSheet: SheetData = base
        ? { ...base, id: `sheet-${uid()}`, name, rows: base.rows.map((r) => [...r]) }
        : { id: `sheet-${uid()}`, name, columns: [{ name: 'Coluna A', type: 'text' }], rows: [] }
      return { ...w, sheets: [...w.sheets, newSheet], activeSheetId: newSheet.id }
    })
  }, [])

  const renameSheet = useCallback((id: string, name: string) => {
    setWorkbook((w) => {
      if (!w) return w
      return { ...w, sheets: w.sheets.map((s) => (s.id === id ? { ...s, name } : s)) }
    })
  }, [])

  const deleteSheet = useCallback((id: string) => {
    setWorkbook((w) => {
      if (!w) return w
      if (w.sheets.length <= 1) return w
      const sheets = w.sheets.filter((s) => s.id !== id)
      const activeSheetId = w.activeSheetId === id ? sheets[0].id : w.activeSheetId
      return { ...w, sheets, activeSheetId }
    })
  }, [])

  const setCell = useCallback(
    (sheetId: string, rowIdx: number, colIdx: number, value: string | number | null) => {
      setWorkbook((w) => {
        if (!w) return w
        return {
          ...w,
          sheets: w.sheets.map((s) => {
            if (s.id !== sheetId) return s
            const rows = s.rows.map((r, ri) =>
              ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? value : c)) : r,
            )
            return { ...s, rows }
          }),
        }
      })
    },
    [],
  )

  const addRow = useCallback(() => {
    setWorkbook((w) => {
      if (!w || !w.activeSheetId) return w
      return {
        ...w,
        sheets: w.sheets.map((s) => {
          if (s.id !== w.activeSheetId) return s
          return { ...s, rows: [...s.rows, s.columns.map(() => null)] }
        }),
      }
    })
  }, [])

  const addColumn = useCallback((name: string) => {
    setWorkbook((w) => {
      if (!w || !w.activeSheetId) return w
      return {
        ...w,
        sheets: w.sheets.map((s) => {
          if (s.id !== w.activeSheetId) return s
          return {
            ...s,
            columns: [...s.columns, { name, type: 'text' }],
            rows: s.rows.map((r) => [...r, null]),
          }
        }),
      }
    })
  }, [])

  // ---------- Dashboard ----------
  const runAutoDashboard = useCallback(() => {
    if (!activeSheet) return
    setIsGeneratingDash(true)
    // pequeno atraso para o estado "gerando dashboard" aparecer
    setTimeout(() => {
      const gen = generateDashboard(activeSheet)
      setComponents(gen.components)
      setLayout(gen.layout)
      setDashReady(true)
      setIsGeneratingDash(false)
      setView('dashboard')
    }, 900)
  }, [activeSheet])

  const addComponent = useCallback(
    (c: Omit<DashComponent, 'id'>) => {
      setComponents((comps) => {
        const id = `dash-${uid()}`
        const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
        setLayout((prev) => [...prev, { i: id, x: 0, y: maxY, w: 5, h: 4 }])
        return [...comps, { ...c, id } as DashComponent]
      })
    },
    [layout],
  )

  const removeComponent = useCallback((id: string) => {
    setComponents((cs) => cs.filter((c) => c.id !== id))
    setLayout((ls) => ls.filter((l) => l.i !== id))
  }, [])

  const duplicateComponent = useCallback(
    (id: string) => {
      setComponents((cs) => {
        const c = cs.find((x) => x.id === id)
        if (!c) return cs
        const nid = `dash-${uid()}`
        const l = layout.find((x) => x.i === id)
        const maxY = layout.reduce((m, x) => Math.max(m, x.y + x.h), 0)
        setLayout((prev) => [...prev, { i: nid, x: 0, y: maxY, w: l?.w ?? 5, h: l?.h ?? 4 }])
        return [...cs, { ...c, id: nid, title: `${c.title} (cópia)` }]
      })
    },
    [layout],
  )

  const moveComponent = useCallback((newLayout: DashLayoutItem[]) => {
    setLayout(newLayout)
  }, [])

  // ---------- Agente ----------
  const speak = useCallback((text: string) => {
    try {
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'pt-BR'
      u.rate = 1.02
      const voices = window.speechSynthesis.getVoices()
      const pt = voices.find((v) => v.lang.toLowerCase().startsWith('pt'))
      if (pt) u.voice = pt
      window.speechSynthesis.speak(u)
    } catch {
      // síntese indisponível — ignora
    }
  }, [])

  const sendAgentText = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const userMsg: AgentMessage = {
        id: uid(),
        role: 'user',
        content: trimmed,
        created: Date.now(),
      }
      setAgentMessages((m) => [...m, userMsg])
      setAgentStatus('processing')

      // contexto: abas + colunas + dashboard atual
      const wb = lastWorkbookRef.current
      const ctxData = {
        sheets: wb
          ? wb.sheets.map((s) => ({
              name: s.name,
              rowCount: s.rows.length,
              columns: s.columns.map((c) => `${c.name} (${c.type})`),
            }))
          : [],
        dashboard: components.map((c) => ({ id: c.id, title: c.title, kind: c.kind })),
      }

      try {
        const res = await pb.send('/backend/v1/harmoza/agent', {
          method: 'POST',
          body: JSON.stringify({ question: trimmed, data: ctxData }),
        })
        const reply: string = res?.reply ?? 'Desculpe, não consegui processar sua solicitação.'
        const action: string | null = res?.action ?? null
        const params: Record<string, unknown> = res?.params ?? {}

        let finalReply = reply
        let finalAction = action
        let finalParams = params

        // --- EXECUÇÃO da ação no estado real (nunca fingir) ---
        if (action && activeSheet) {
          setAgentStatus('executing')
          try {
            const executed = executeAgentAction(action, params, {
              sheet: activeSheet,
              addComponent,
              removeComponent,
              components,
              createSheet,
              speak,
              setView,
              addColumn,
            })
            finalReply = executed.reply ?? reply
            finalAction = executed.action
            finalParams = executed.params
          } catch (err) {
            finalReply = `Não consegui executar essa ação: ${err instanceof Error ? err.message : 'erro inesperado'}`
            finalAction = null
          }
        }

        setAgentMessages((m) => [
          ...m,
          {
            id: uid(),
            role: 'assistant',
            content: finalReply,
            action: finalAction ?? undefined,
            created: Date.now(),
          },
        ])
        setAgentStatus('done')
        speak(finalReply)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao falar com o agente.'
        setAgentMessages((m) => [
          ...m,
          {
            id: uid(),
            role: 'assistant',
            content: `Não consegui falar com o agente agora: ${msg}`,
            created: Date.now(),
          },
        ])
        setAgentStatus('error')
      }
    },
    [
      activeSheet,
      components,
      addComponent,
      removeComponent,
      createSheet,
      speak,
      setView,
      addColumn,
    ],
  )

  const clearAgent = useCallback(() => setAgentMessages([]), [])

  const value: HarmozaCtx = {
    workbook,
    fileName,
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
    setCell,
    addRow,
    addColumn,
    importFile,
    loadDemo,
    reset,
    components,
    layout,
    dashReady,
    isGeneratingDash,
    runAutoDashboard,
    addComponent,
    removeComponent,
    duplicateComponent,
    moveComponent,
    agentOpen,
    setAgentOpen,
    agentMessages,
    agentStatus,
    sendAgentText,
    clearAgent,
    speak,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Executa uma ação do agente no estado REAL da interface.
// Retorna a resposta final que deve ser mostrada.
function executeAgentAction(
  action: string,
  params: Record<string, unknown>,
  env: {
    sheet: SheetData
    addComponent: (c: Omit<DashComponent, 'id'>) => void
    removeComponent: (id: string) => void
    components: DashComponent[]
    createSheet: (name: string, fromSheetId?: string) => void
    speak: (t: string) => void
    setView: (v: ViewMode) => void
    addColumn: (name: string) => void
  },
): { reply?: string; action?: string; params?: Record<string, unknown> } {
  const { sheet, addComponent, removeComponent, components, createSheet, setView } = env

  switch (action) {
    case 'create_chart': {
      const title = String(params.title ?? 'Novo gráfico')
      const kindRaw = String(params.kind ?? 'bar').toLowerCase()
      const kind =
        kindRaw === 'pie' || kindRaw === 'pizza' || kindRaw === 'donut'
          ? 'pie'
          : kindRaw === 'line'
            ? 'line'
            : kindRaw === 'ranking'
              ? 'ranking'
              : kindRaw === 'table'
                ? 'table'
                : 'bar'
      const groupCol = String(params.groupBy ?? params.group ?? '')
      const valueCol = String(params.valueBy ?? params.value ?? '')
      const label = groupCol || 'Registro'
      const valueLabel = valueCol || 'Valor'
      const gIdx = sheet.columns.findIndex((c) => c.name.toLowerCase() === label.toLowerCase())
      const vIdx = sheet.columns.findIndex((c) => c.name.toLowerCase() === valueLabel.toLowerCase())
      if (gIdx >= 0 && vIdx >= 0) {
        const m = new Map<string, number>()
        for (const r of sheet.rows) {
          const g = String(r[gIdx] ?? '').trim()
          const v = r[vIdx]
          if (!g) continue
          if (typeof v !== 'number') continue
          m.set(g, (m.get(g) ?? 0) + v)
        }
        const data = Array.from(m.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([l, v]) => ({ label: l, value: Math.round(v * 100) / 100 }))
        addComponent({
          kind,
          title,
          data,
          config: { currency: sheet.columns[vIdx].type === 'currency' },
        })
        return {
          reply: `Pronto! Criei o gráfico "${title}" com os dados reais da planilha.`,
          action,
        }
      }
      // fallback: usar primeira coluna de texto e numérica
      const tIdx = sheet.columns.findIndex((c) => c.type === 'text')
      const nIdx = sheet.columns.findIndex((c) => c.type === 'number' || c.type === 'currency')
      if (tIdx >= 0 && nIdx >= 0) {
        const m = new Map<string, number>()
        for (const r of sheet.rows) {
          const g = String(r[tIdx] ?? '').trim()
          const v = r[nIdx]
          if (!g || typeof v !== 'number') continue
          m.set(g, (m.get(g) ?? 0) + v)
        }
        const data = Array.from(m.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([l, v]) => ({ label: l, value: Math.round(v * 100) / 100 }))
        addComponent({
          kind,
          title,
          data,
          config: { currency: sheet.columns[nIdx].type === 'currency' },
        })
        return {
          reply: `Pronto! Criei o gráfico "${title}" usando ${sheet.columns[tIdx].name} e ${sheet.columns[nIdx].name}.`,
          action,
        }
      }
      return { reply: 'Não encontrei colunas suficientes para criar esse gráfico.', action: null }
    }
    case 'remove_chart': {
      const target = String(params.title ?? params.target ?? '')
      const comp = components.find(
        (c) => target && c.title.toLowerCase().includes(target.toLowerCase()),
      )
      if (comp) {
        removeComponent(comp.id)
        return { reply: `Removi o componente "${comp.title}".`, action }
      }
      return { reply: 'Não encontrei um componente com esse nome para remover.', action: null }
    }
    case 'move_chart': {
      const target = String(params.title ?? params.target ?? '')
      const comp = components.find(
        (c) => target && c.title.toLowerCase().includes(target.toLowerCase()),
      )
      if (!comp) {
        return { reply: 'Não encontrei o componente para mover.', action: null }
      }
      return {
        reply: `Você pode arrastar "${comp.title}" para onde preferir — arraste pelo cabeçalho do card.`,
        action,
      }
    }
    case 'add_kpi': {
      const title = String(params.title ?? 'Novo indicador')
      const value = String(params.value ?? '')
      addComponent({
        kind: 'kpi',
        title,
        data: [{ label: title, value: 0 }],
        config: { value: value || '—' },
      })
      return { reply: `Adicionei o indicador "${title}" ao dashboard.`, action }
    }
    case 'create_sheet': {
      const name = String(params.name ?? params.title ?? 'Nova aba')
      createSheet(name)
      return { reply: `Criei a nova aba "${name}" e já deixei ela selecionada.`, action }
    }
    default:
      return { reply: undefined }
  }
}

export function useHarmoza(): HarmozaCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useHarmoza deve ser usado dentro de <HarmozaProvider>')
  return ctx
}
