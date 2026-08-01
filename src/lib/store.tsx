import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
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

const LS_KEY = 'harmoza-state-v2'
const V1_KEY = 'harmoza-state-v1'

interface PersistedState {
  workbooks: Workbook[]
  activeWorkbookId: string | null
  view: ViewMode
  components: DashComponent[]
  layout: DashLayoutItem[]
}

interface HarmozaCtx {
  workbook: Workbook | null
  workbooks: Workbook[]
  activeWorkbookId: string | null
  fileName: string
  importState: ImportState
  importError: string
  warnings: string[]
  activeSheet: SheetData | null
  view: ViewMode
  setView: (v: ViewMode) => void
  setActiveSheet: (id: string) => void
  createSheet: (name: string, fromSheetId?: string) => void
  renameSheet: (id: string, name: string) => void
  deleteSheet: (id: string) => void
  updateSheet: (sheet: SheetData) => void
  addRow: () => void
  addColumn: (name: string) => void
  importFile: (file: File) => Promise<void>
  loadDemo: () => Promise<void>
  switchWorkbook: (id: string) => void
  reset: () => void
  components: DashComponent[]
  layout: DashLayoutItem[]
  dashReady: boolean
  isGeneratingDash: boolean
  runAutoDashboard: () => void
  addComponent: (c: Omit<DashComponent, 'id'>) => void
  removeComponent: (id: string) => void
  duplicateComponent: (id: string) => void
  moveComponent: (layout: DashLayoutItem[]) => void
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
    if (raw) {
      const p = JSON.parse(raw) as PersistedState
      if (p.workbooks && Array.isArray(p.workbooks)) return p
    }
    const v1raw = localStorage.getItem(V1_KEY)
    if (v1raw) {
      const v1 = JSON.parse(v1raw) as {
        workbook?: Workbook | null
        view?: ViewMode
        components?: DashComponent[]
        layout?: DashLayoutItem[]
      }
      if (v1.workbook) {
        return {
          workbooks: [v1.workbook],
          activeWorkbookId: v1.workbook.id,
          view: v1.view ?? 'sheet',
          components: v1.components ?? [],
          layout: v1.layout ?? [],
        }
      }
    }
    return null
  } catch {
    return null
  }
}

const uid = () => Math.random().toString(36).slice(2, 10)

export function HarmozaProvider({ children }: { children: ReactNode }) {
  const [persisted] = useState(loadPersisted)
  const [workbooks, setWorkbooks] = useState<Workbook[]>(persisted?.workbooks ?? [])
  const [activeWorkbookId, setActiveWorkbookId] = useState<string | null>(
    persisted?.activeWorkbookId ?? null,
  )
  const [importState, setImportState] = useState<ImportState>(
    persisted?.workbooks?.length ? 'success' : 'idle',
  )
  const [importError, setImportError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [view, setView] = useState<ViewMode>(persisted?.view ?? 'sheet')
  const [components, setComponents] = useState<DashComponent[]>(persisted?.components ?? [])
  const [layout, setLayout] = useState<DashLayoutItem[]>(persisted?.layout ?? [])
  const [dashReady, setDashReady] = useState(!!persisted?.components?.length)
  const [isGeneratingDash, setIsGeneratingDash] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([])
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')

  const workbook = useMemo(
    () => workbooks.find((w) => w.id === activeWorkbookId) ?? null,
    [workbooks, activeWorkbookId],
  )
  const fileName = useMemo(() => workbook?.fileName ?? '', [workbook])

  const lastWorkbookRef = useRef<Workbook | null>(workbook)
  lastWorkbookRef.current = workbook

  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ workbooks, activeWorkbookId, view, components, layout }),
    )
  }, [workbooks, activeWorkbookId, view, components, layout])

  const activeSheet = useMemo(() => {
    if (!workbook) return null
    return (
      workbook.sheets.find((s) => s.id === workbook.activeSheetId) ?? workbook.sheets[0] ?? null
    )
  }, [workbook])

  const importFile = useCallback(async (file: File) => {
    setImportState('loading')
    setImportError('')
    setWarnings([])
    try {
      const res = await parseExcelFile(file)
      const wb = res.workbook
      setWorkbooks((prev) => [...prev, wb])
      setActiveWorkbookId(wb.id)
      setWarnings(res.warnings || [])
      setImportState('success')
      setView('sheet')

      if (wb.sheets && wb.sheets.length > 0) {
        const gen = generateDashboard(wb.sheets[0])
        setComponents(gen.components)
        setLayout(gen.layout)
        setDashReady(true)
      }

      if (pb.authStore.isValid && pb.authStore.record?.id) {
        try {
          await pb.collection('workbooks').create({
            owner: pb.authStore.record.id,
            name: wb.fileName.replace(/\.xlsx?$/i, ''),
            fileName: wb.fileName,
            rawJson: wb,
          })
        } catch (e) {
          console.warn('Could not persist workbook in backend:', e)
        }
      }

      toast.success(`Planilha "${wb.fileName}" importada!`, {
        description: `${wb.sheets.length} aba(s) identificada(s). Redirecionando para visualização.`,
      })
    } catch (err) {
      setImportState('error')
      const msg = err instanceof Error ? err.message : 'Não foi possível processar o arquivo.'
      setImportError(msg)
      toast.error('Erro na importação', { description: msg })
    }
  }, [])

  const loadDemo = useCallback(async () => {
    const wb = demoWorkbook()
    setWorkbooks((prev) => {
      const exists = prev.find((w) => w.id === wb.id)
      return exists ? prev : [...prev, wb]
    })
    setActiveWorkbookId(wb.id)
    setImportState('success')
    setImportError('')
    setWarnings([])
    setView('sheet')

    if (wb.sheets && wb.sheets.length > 0) {
      const gen = generateDashboard(wb.sheets[0])
      setComponents(gen.components)
      setLayout(gen.layout)
      setDashReady(true)
    }

    toast.success('Planilha de demonstração carregada!', {
      description: 'Aba Vendas 2025 pronta para análise.',
    })
  }, [])

  const switchWorkbook = useCallback(
    (id: string) => {
      const target = workbooks.find((w) => w.id === id)
      if (!target) return
      setActiveWorkbookId(id)
      setImportState('success')
      setView('sheet')
      const sheet = target.sheets.find((s) => s.id === target.activeSheetId) ?? target.sheets[0]
      if (sheet) {
        const gen = generateDashboard(sheet)
        setComponents(gen.components)
        setLayout(gen.layout)
        setDashReady(true)
      }
    },
    [workbooks],
  )

  const reset = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(V1_KEY)
    setWorkbooks([])
    setActiveWorkbookId(null)
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

  const setActiveSheet = useCallback(
    (id: string) => {
      setWorkbooks((prev) =>
        prev.map((w) => {
          if (w.id !== activeWorkbookId || !w.sheets.some((s) => s.id === id)) return w
          const targetSheet = w.sheets.find((s) => s.id === id)
          if (targetSheet) {
            const gen = generateDashboard(targetSheet)
            setComponents(gen.components)
            setLayout(gen.layout)
            setDashReady(true)
          }
          return { ...w, activeSheetId: id }
        }),
      )
    },
    [activeWorkbookId],
  )

  const createSheet = useCallback(
    (name: string, fromSheetId?: string) => {
      setWorkbooks((prev) =>
        prev.map((w) => {
          if (w.id !== activeWorkbookId) return w
          const base = fromSheetId ? w.sheets.find((s) => s.id === fromSheetId) : null
          const ns: SheetData = base
            ? { ...base, id: 'sheet-' + uid(), name, rows: base.rows.map((r) => [...r]) }
            : {
                id: 'sheet-' + uid(),
                name,
                columns: [{ name: 'Coluna A', type: 'text' }],
                rows: [],
              }
          return { ...w, sheets: [...w.sheets, ns], activeSheetId: ns.id }
        }),
      )
    },
    [activeWorkbookId],
  )

  const renameSheet = useCallback(
    (id: string, name: string) => {
      setWorkbooks((prev) =>
        prev.map((w) =>
          w.id === activeWorkbookId
            ? { ...w, sheets: w.sheets.map((s) => (s.id === id ? { ...s, name } : s)) }
            : w,
        ),
      )
    },
    [activeWorkbookId],
  )

  const deleteSheet = useCallback(
    (id: string) => {
      setWorkbooks((prev) =>
        prev.map((w) => {
          if (w.id !== activeWorkbookId || w.sheets.length <= 1) return w
          const sheets = w.sheets.filter((s) => s.id !== id)
          return {
            ...w,
            sheets,
            activeSheetId: w.activeSheetId === id ? sheets[0].id : w.activeSheetId,
          }
        }),
      )
    },
    [activeWorkbookId],
  )

  const updateSheet = useCallback(
    (sheet: SheetData) => {
      setWorkbooks((prev) =>
        prev.map((w) =>
          w.id === activeWorkbookId
            ? { ...w, sheets: w.sheets.map((s) => (s.id === sheet.id ? sheet : s)) }
            : w,
        ),
      )
    },
    [activeWorkbookId],
  )

  const addRow = useCallback(() => {
    setWorkbooks((prev) =>
      prev.map((w) => {
        if (w.id !== activeWorkbookId || !w.activeSheetId) return w
        return {
          ...w,
          sheets: w.sheets.map((s) =>
            s.id === w.activeSheetId ? { ...s, rows: [...s.rows, s.columns.map(() => null)] } : s,
          ),
        }
      }),
    )
  }, [activeWorkbookId])

  const addColumn = useCallback(
    (name: string) => {
      setWorkbooks((prev) =>
        prev.map((w) => {
          if (w.id !== activeWorkbookId || !w.activeSheetId) return w
          return {
            ...w,
            sheets: w.sheets.map((s) =>
              s.id === w.activeSheetId
                ? {
                    ...s,
                    columns: [...s.columns, { name, type: 'text' }],
                    rows: s.rows.map((r) => [...r, null]),
                  }
                : s,
            ),
          }
        }),
      )
    },
    [activeWorkbookId],
  )

  const runAutoDashboard = useCallback(() => {
    if (!activeSheet) return
    setIsGeneratingDash(true)
    setTimeout(() => {
      const gen = generateDashboard(activeSheet)
      setComponents(gen.components)
      setLayout(gen.layout)
      setDashReady(true)
      setIsGeneratingDash(false)
      setView('dashboard')
    }, 500)
  }, [activeSheet])

  const addComponent = useCallback(
    (c: Omit<DashComponent, 'id'>) => {
      const id = 'dash-' + uid()
      const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)
      setLayout((p) => [...p, { i: id, x: 0, y: maxY, w: 5, h: 4 }])
      setComponents((cs) => [...cs, { ...c, id } as DashComponent])
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
        const nid = 'dash-' + uid()
        const l = layout.find((x) => x.i === id)
        const maxY = layout.reduce((m, x) => Math.max(m, x.y + x.h), 0)
        setLayout((p) => [...p, { i: nid, x: 0, y: maxY, w: l?.w ?? 5, h: l?.h ?? 4 }])
        return [...cs, { ...c, id: nid, title: c.title + ' (cópia)' }]
      })
    },
    [layout],
  )

  const moveComponent = useCallback((newLayout: DashLayoutItem[]) => setLayout(newLayout), [])

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
      /* noop */
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

      const wb = lastWorkbookRef.current
      const ctxData = {
        sheets: wb
          ? wb.sheets.map((s) => ({
              name: s.name,
              rowCount: s.rows.length,
              columns: s.columns.map((c) => c.name + ' (' + c.type + ')'),
            }))
          : [],
        dashboard: components.map((c) => ({ id: c.id, title: c.title, kind: c.kind })),
      }

      try {
        const res = await pb.send('/backend/v1/harmoza/agent', {
          method: 'POST',
          body: JSON.stringify({ question: trimmed, data: ctxData }),
        })
        const reply: string = res?.reply ?? 'Desculpe, não consegui processar.'
        const action: string | null = res?.action ?? null
        const params: Record<string, unknown> = res?.params ?? {}
        let finalReply = reply
        let finalAction = action
        if (action && activeSheet) {
          setAgentStatus('executing')
          try {
            const ex = executeAgentAction(action, params, {
              sheet: activeSheet,
              addComponent,
              removeComponent,
              components,
              createSheet,
              speak,
              setView,
              addColumn,
            })
            finalReply = ex.reply ?? reply
            finalAction = ex.action
          } catch {
            finalReply = 'Não consegui executar essa ação.'
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
      } catch {
        setAgentMessages((m) => [
          ...m,
          {
            id: uid(),
            role: 'assistant',
            content: 'Não consegui falar com o agente agora.',
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
    workbooks,
    activeWorkbookId,
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
    updateSheet,
    addRow,
    addColumn,
    importFile,
    loadDemo,
    switchWorkbook,
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

function executeAgentAction(
  action: string,
  params: Record<string, unknown>,
  env: {
    sheet: SheetData
    addComponent: (c: Omit<DashComponent, 'id'>) => void
    removeComponent: (id: string) => void
    components: DashComponent[]
    createSheet: (name: string) => void
    speak: (t: string) => void
    setView: (v: ViewMode) => void
    addColumn: (name: string) => void
  },
): { reply?: string; action?: string } {
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
        return { reply: 'Pronto! Criei o gráfico "' + title + '" com os dados reais.', action }
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
        return { reply: 'Removi o componente "' + comp.title + '".', action }
      }
      return { reply: 'Não encontrei um componente com esse nome.', action: null }
    }
    case 'move_chart': {
      const target = String(params.title ?? params.target ?? '')
      const comp = components.find(
        (c) => target && c.title.toLowerCase().includes(target.toLowerCase()),
      )
      if (!comp) return { reply: 'Não encontrei o componente para mover.', action: null }
      return { reply: 'Arraste "' + comp.title + '" pelo cabeçalho para reposicionar.', action }
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
      return { reply: 'Adicionei o indicador "' + title + '" ao dashboard.', action }
    }
    case 'create_sheet': {
      const name = String(params.name ?? params.title ?? 'Nova aba')
      createSheet(name)
      setView('sheet')
      return { reply: 'Criei a nova aba "' + name + '" e deixei selecionada.', action }
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
