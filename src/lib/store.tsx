import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { toast } from 'sonner'
import type {
  AgentMessage,
  AgentStatus,
  ComponentFilter,
  DashComponent,
  DashKind,
  DashLayoutItem,
  ImportState,
  SheetData,
  ViewMode,
  Workbook,
} from './types'
import { generateDashboard } from './dashboard'
import { recomputeComponentData, validateFieldExists, getAvailableFields } from './componentData'
import { demoWorkbook } from './demo'
import { parseFiles } from './fileParser'
import pb from './pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

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
  importFile: (files: File | File[]) => Promise<void>
  loadDemo: () => Promise<void>
  switchWorkbook: (id: string) => void
  reset: () => void
  fetchRemoteWorkbooks: () => Promise<void>
  deleteWorkbook: (id: string) => Promise<{ error: string | null }>
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
  agentError: string
  agentTargetWorkbookId: string | null
  selectedComponentId: string | null
  setSelectedComponent: (id: string | null) => void
  sendAgentText: (text: string) => Promise<void>
  retryAgent: () => Promise<void>
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
  const agentMessagesRef = useRef<AgentMessage[]>([])
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')
  const [agentError, setAgentError] = useState('')
  const [agentTargetWorkbookId, setAgentTargetWorkbookId] = useState<string | null>(null)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const lastQueryRef = useRef('')

  const workbook = useMemo(
    () => workbooks.find((w) => w.id === activeWorkbookId) ?? null,
    [workbooks, activeWorkbookId],
  )
  const fileName = useMemo(() => workbook?.fileName ?? '', [workbook])

  const lastWorkbookRef = useRef<Workbook | null>(workbook)
  lastWorkbookRef.current = workbook

  const activeSheet = useMemo(() => {
    if (!workbook) return null
    return (
      workbook.sheets.find((s) => s.id === workbook.activeSheetId) ?? workbook.sheets[0] ?? null
    )
  }, [workbook])

  const importFile = useCallback(async (files: File | File[]) => {
    const fileArr = Array.isArray(files) ? files : [files]
    if (!fileArr.length) return
    setImportState('loading')
    setImportError('')
    setWarnings([])
    try {
      const res = await parseFiles(fileArr)
      if (res.workbook) {
        const wb = res.workbook
        setWorkbooks((prev) => [...prev, wb])
        setActiveWorkbookId(wb.id)
        setWarnings([...res.warnings, ...res.errors])
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
              name: wb.fileName.replace(/\.[^/.]+$/, ''),
              fileName: wb.fileName,
              rawJson: wb,
              source: 'upload',
            })
          } catch (e) {
            console.warn('Could not persist workbook in backend:', e)
          }
        }

        if (res.errors.length > 0) {
          toast.warning('Importação parcial', {
            description: `${wb.sheets.length} aba(s) importada(s). ${res.errors.length} arquivo(s) não puderam ser processado(s).`,
          })
        } else {
          toast.success(`Planilha "${wb.fileName}" importada!`, {
            description: `${wb.sheets.length} aba(s) identificada(s). Redirecionando para visualização.`,
          })
        }
      } else {
        setImportState('error')
        const msg =
          res.errors.length > 0 ? res.errors.join('\n') : 'Nenhum arquivo válido foi encontrado.'
        setImportError(msg)
        toast.error('Erro na importação', { description: msg })
      }
    } catch (err) {
      setImportState('error')
      const msg = err instanceof Error ? err.message : 'Não foi possível processar o arquivo.'
      setImportError(msg)
      toast.error('Erro na importação', { description: msg })
    }
  }, [])

  const fetchRemoteWorkbooks = useCallback(async () => {
    if (!pb.authStore.isValid || !pb.authStore.record?.id) return
    try {
      const records = await pb.collection('workbooks').getFullList({
        filter: `owner = "${pb.authStore.record.id}"`,
        sort: '-created',
      })
      const remoteWbs: Workbook[] = []
      for (const r of records) {
        try {
          const raw = typeof r.rawJson === 'string' ? JSON.parse(r.rawJson) : r.rawJson
          if (raw && raw.sheets && raw.id) {
            remoteWbs.push(raw as Workbook)
          }
        } catch {
          /* skip malformed */
        }
      }
      if (remoteWbs.length > 0) {
        setWorkbooks((prev) => {
          const existingIds = new Set(prev.map((w) => w.id))
          const toAdd = remoteWbs.filter((w) => !existingIds.has(w.id))
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev
        })
      }
    } catch {
      /* network or auth error — silently ignore */
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
    agentMessagesRef.current = []
    setAgentOpen(false)
    setAgentError('')
    setAgentTargetWorkbookId(null)
  }, [])

  useEffect(() => {
    fetchRemoteWorkbooks()
  }, [])

  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ workbooks, activeWorkbookId, view, components, layout }),
    )
  }, [workbooks, activeWorkbookId, view, components, layout])

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

  const updateComponentKind = useCallback((id: string, kind: DashKind) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, kind } : c)))
  }, [])

  const deleteItemFromSheet = useCallback(
    (itemTarget: string): { count: number; sheetName: string } => {
      let count = 0
      let sheetName = ''
      if (!activeWorkbookId) return { count, sheetName }

      setWorkbooks((prev) =>
        prev.map((w) => {
          if (w.id !== activeWorkbookId) return w
          const targetSheetId = w.activeSheetId || w.sheets[0]?.id
          const sheets = w.sheets.map((s) => {
            if (s.id !== targetSheetId) return s
            sheetName = s.name
            const lowerTarget = itemTarget.toLowerCase()
            const newRows = s.rows.filter((row) => {
              const hasMatch = row.some(
                (cell) => cell !== null && String(cell).toLowerCase().includes(lowerTarget),
              )
              if (hasMatch) count++
              return !hasMatch
            })
            return { ...s, rows: newRows }
          })
          const updatedWb = { ...w, sheets }

          if (pb.authStore.isValid && pb.authStore.record?.id) {
            pb.collection('workbooks')
              .getList(1, 1, {
                filter: `owner = "${pb.authStore.record.id}" && fileName = "${w.fileName}"`,
              })
              .then((res) => {
                if (res.items.length > 0) {
                  pb.collection('workbooks')
                    .update(res.items[0].id, { rawJson: updatedWb })
                    .catch(() => {})
                }
              })
              .catch(() => {})
          }

          return updatedWb
        }),
      )

      if (activeSheet) {
        const lowerTarget = itemTarget.toLowerCase()
        const newRows = activeSheet.rows.filter(
          (row) =>
            !row.some((cell) => cell !== null && String(cell).toLowerCase().includes(lowerTarget)),
        )
        const updatedSheet = { ...activeSheet, rows: newRows }
        const gen = generateDashboard(updatedSheet)
        setComponents(gen.components)
        setLayout(gen.layout)
      }

      return { count, sheetName: sheetName || activeSheet?.name || 'Planilha' }
    },
    [activeWorkbookId, activeSheet],
  )

  useRealtime('workbooks', (e) => {
    if (e.action === 'update' || e.action === 'create') {
      try {
        const raw =
          typeof e.record.rawJson === 'string' ? JSON.parse(e.record.rawJson) : e.record.rawJson
        if (raw && raw.id && raw.sheets) {
          setWorkbooks((prev) => {
            const idx = prev.findIndex((w) => w.id === raw.id || w.fileName === raw.fileName)
            if (idx >= 0) {
              const updated = [...prev]
              updated[idx] = raw as Workbook
              return updated
            }
            return [...prev, raw as Workbook]
          })
        }
      } catch {
        /* intentionally ignored */
      }
    }
  })

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

  const persistWorkbookChange = useCallback((wb: Workbook) => {
    if (!pb.authStore.isValid || !pb.authStore.record?.id) return
    pb.collection('workbooks')
      .getList(1, 1, {
        filter: `owner = "${pb.authStore.record.id}" && fileName = "${wb.fileName}"`,
      })
      .then((res) => {
        if (res.items.length > 0) {
          pb.collection('workbooks')
            .update(res.items[0].id, { rawJson: wb })
            .catch(() => {})
        }
      })
      .catch(() => {})
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
      const newMessages = [...agentMessagesRef.current, userMsg]
      agentMessagesRef.current = newMessages
      setAgentMessages(newMessages)
      setAgentStatus('processing')
      setAgentError('')
      lastQueryRef.current = trimmed

      const workbooksSummary = workbooks
        .map((wb) => {
          const sheetsInfo = wb.sheets
            .map(
              (s) =>
                `  Aba "${s.name}": ${s.rows.length} linhas, colunas: ${s.columns.map((c) => c.name + ' (' + c.type + ')').join(', ')}`,
            )
            .join('\n')
          return `Arquivo: name="${wb.fileName.replace(/\.[^/.]+$/, '')}", fileName="${wb.fileName}", id="${wb.id}"\n${sheetsInfo}`
        })
        .join('\n---\n')

      const dashboardSummary =
        components.length > 0
          ? components
              .map((c) => {
                const cfg = c.config || {}
                const dim = cfg.dimensionCol ? `dim="${cfg.dimensionCol}"` : ''
                const met = cfg.metricCol ? `metric="${cfg.metricCol}"` : ''
                const flt = (cfg.filters as ComponentFilter[]) || []
                const filtStr =
                  flt.length > 0
                    ? `filters=[${flt.map((f) => `${f.field} ${f.op} ${f.value}`).join(', ')}]`
                    : ''
                const parts = [dim, met, filtStr].filter(Boolean).join(', ')
                return `- ${c.title} (${c.kind}${parts ? ', ' + parts : ''})`
              })
              .join('\n')
          : 'Dashboard vazio'

      const messagesPayload = newMessages.map((m) => ({ role: m.role, content: m.content }))

      try {
        const res = await pb.send('/backend/v1/harmoza/agent', {
          method: 'POST',
          body: JSON.stringify({ messages: messagesPayload, workbooksSummary, dashboardSummary }),
        })
        const reply: string = res?.reply ?? 'Desculpe, não consegui processar.'
        const action: string | null = res?.action ?? null
        const params: Record<string, unknown> = res?.params ?? {}
        let finalReply = reply
        let finalAction = action
        if (action && action !== 'answer') {
          setAgentStatus('executing')
          try {
            const ex = executeAgentAction(action, params, {
              workbooks,
              activeWorkbookId,
              setWorkbooks,
              setActiveWorkbookId,
              components,
              setComponents,
              setLayout,
              setDashReady,
              setView,
              setAgentTargetWorkbookId,
              selectedComponentId,
              setSelectedComponentId,
              speak,
              persistWorkbookChange,
            })
            finalReply = ex.reply ?? reply
            finalAction = ex.action
          } catch {
            finalReply = 'Não consegui executar essa ação.'
            finalAction = null
          }
        }
        const assistantMsg: AgentMessage = {
          id: uid(),
          role: 'assistant',
          content: finalReply,
          action: finalAction ?? undefined,
          created: Date.now(),
        }
        const updated = [...agentMessagesRef.current, assistantMsg]
        agentMessagesRef.current = updated
        setAgentMessages(updated)
        setAgentStatus('done')
      } catch {
        setAgentError(
          'Não foi possível conectar ao agente. Verifique sua conexão e tente novamente.',
        )
        setAgentStatus('error')
      }
    },
    [
      workbooks,
      activeWorkbookId,
      components,
      speak,
      setView,
      persistWorkbookChange,
      selectedComponentId,
    ],
  )

  const retryAgent = useCallback(async () => {
    const lastQuery = lastQueryRef.current
    if (!lastQuery) return
    const current = agentMessagesRef.current
    if (current.length > 0 && current[current.length - 1].role === 'user') {
      const trimmed = current.slice(0, -1)
      agentMessagesRef.current = trimmed
      setAgentMessages(trimmed)
    }
    setAgentError('')
    await sendAgentText(lastQuery)
  }, [sendAgentText])

  const deleteWorkbook = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const wb = workbooks.find((w) => w.id === id)
      if (!wb) return { error: 'Arquivo não encontrado.' }
      try {
        if (pb.authStore.isValid && pb.authStore.record?.id) {
          try {
            const records = await pb.collection('workbooks').getList(1, 1, {
              filter: `owner = "${pb.authStore.record.id}" && fileName = "${wb.fileName}"`,
            })
            if (records.items.length > 0) {
              await pb.collection('workbooks').delete(records.items[0].id)
            }
          } catch (e) {
            console.warn('Could not delete workbook from backend:', e)
          }
        }
        setWorkbooks((prev) => {
          const filtered = prev.filter((w) => w.id !== id)
          if (activeWorkbookId === id) {
            if (filtered.length > 0) {
              const next = filtered[0]
              setActiveWorkbookId(next.id)
              const sheet = next.sheets.find((s) => s.id === next.activeSheetId) ?? next.sheets[0]
              if (sheet) {
                const gen = generateDashboard(sheet)
                setComponents(gen.components)
                setLayout(gen.layout)
                setDashReady(true)
              }
            } else {
              setActiveWorkbookId(null)
              setImportState('idle')
              setComponents([])
              setLayout([])
              setDashReady(false)
            }
          }
          return filtered
        })
        toast.success('Arquivo excluído', {
          description: `"${wb.fileName}" foi removido com sucesso.`,
        })
        return { error: null }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Não foi possível excluir o arquivo.'
        toast.error('Erro ao excluir', { description: msg })
        return { error: msg }
      }
    },
    [workbooks, activeWorkbookId],
  )

  const clearAgent = useCallback(() => {
    agentMessagesRef.current = []
    setAgentMessages([])
  }, [])

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
    fetchRemoteWorkbooks,
    deleteWorkbook,
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
    agentError,
    agentTargetWorkbookId,
    selectedComponentId,
    setSelectedComponent: setSelectedComponentId,
    sendAgentText,
    retryAgent,
    clearAgent,
    speak,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function executeAgentAction(
  action: string,
  params: Record<string, unknown>,
  env: {
    workbooks: Workbook[]
    activeWorkbookId: string | null
    setWorkbooks: Dispatch<SetStateAction<Workbook[]>>
    setActiveWorkbookId: (id: string) => void
    components: DashComponent[]
    setComponents: Dispatch<SetStateAction<DashComponent[]>>
    setLayout: Dispatch<SetStateAction<DashLayoutItem[]>>
    setDashReady: (v: boolean) => void
    setView: (v: ViewMode) => void
    setAgentTargetWorkbookId: (id: string) => void
    selectedComponentId: string | null
    setSelectedComponentId: (id: string | null) => void
    speak: (t: string) => void
    persistWorkbookChange: (wb: Workbook) => void
  },
): { reply?: string; action?: string | null } {
  const {
    workbooks,
    activeWorkbookId,
    setWorkbooks,
    setActiveWorkbookId,
    components,
    setComponents,
    setLayout,
    setDashReady,
    setView,
    setAgentTargetWorkbookId,
    selectedComponentId,
    setSelectedComponentId,
    persistWorkbookChange,
  } = env

  function findTargetWorkbook(): { workbook: Workbook | null; ambiguous: boolean } {
    const target = String(params.workbook ?? params.fileName ?? '')
      .trim()
      .toLowerCase()
    if (!target) {
      if (workbooks.length === 1) return { workbook: workbooks[0], ambiguous: false }
      if (workbooks.length > 1) return { workbook: null, ambiguous: true }
      return { workbook: null, ambiguous: false }
    }
    const found = workbooks.find(
      (wb) =>
        wb.fileName.toLowerCase() === target ||
        wb.fileName.replace(/\.[^/.]+$/, '').toLowerCase() === target ||
        wb.fileName.toLowerCase().includes(target),
    )
    return { workbook: found ?? null, ambiguous: false }
  }

  function resolveSheet(wb: Workbook): SheetData | null {
    const sheetName = String(params.sheetName ?? '')
      .trim()
      .toLowerCase()
    if (sheetName) {
      return (
        wb.sheets.find((s) => s.name.toLowerCase() === sheetName) ??
        wb.sheets.find((s) => s.name.toLowerCase().includes(sheetName)) ??
        wb.sheets.find((s) => s.id === wb.activeSheetId) ??
        wb.sheets[0] ??
        null
      )
    }
    return wb.sheets.find((s) => s.id === wb.activeSheetId) ?? wb.sheets[0] ?? null
  }

  function normalizeKind(kindRaw: string): DashKind {
    const k = kindRaw.toLowerCase()
    if (k === 'pie' || k === 'pizza' || k === 'donut') return 'pie'
    if (k === 'line' || k === 'linha') return 'line'
    if (k === 'ranking') return 'ranking'
    if (k === 'table' || k === 'tabela') return 'table'
    return 'bar'
  }

  function ambiguityReply(): string {
    const list = workbooks.map((w) => `- ${w.fileName}`).join('\n')
    return `Você tem múltiplos arquivos. Por favor, especifique qual arquivo deseja usar:\n${list}`
  }

  switch (action) {
    case 'update_chart': {
      const { workbook: targetWb, ambiguous } = findTargetWorkbook()
      if (ambiguous) return { reply: ambiguityReply(), action: null }
      if (!targetWb) return { reply: 'Não encontrei o arquivo especificado.', action: null }
      setAgentTargetWorkbookId(targetWb.id)

      const kind = normalizeKind(String(params.kind ?? 'bar'))
      const target = String(params.title ?? params.target ?? '').trim()

      if (targetWb.id !== activeWorkbookId) {
        setActiveWorkbookId(targetWb.id)
        const sheet = resolveSheet(targetWb)
        if (sheet) {
          const gen = generateDashboard(sheet)
          const comp = target
            ? gen.components.find((c) => c.title.toLowerCase().includes(target.toLowerCase()))
            : gen.components[0]
          if (comp) {
            setComponents(gen.components.map((c) => (c.id === comp.id ? { ...c, kind } : c)))
            setLayout(gen.layout)
            setDashReady(true)
            setView('dashboard')
            return {
              reply: `Alterei o gráfico **"${comp.title}"** para **${kind}** no arquivo **${targetWb.fileName}**.`,
              action,
            }
          }
        }
        return { reply: 'Não encontrei o gráfico no arquivo especificado.', action: null }
      }

      const comp = components.find((c) =>
        target ? c.title.toLowerCase().includes(target.toLowerCase()) : true,
      )
      if (comp) {
        setComponents((prev) => prev.map((c) => (c.id === comp.id ? { ...c, kind } : c)))
        return {
          reply: `Alterei o tipo do gráfico **"${comp.title}"** para **${kind}** no arquivo **${targetWb.fileName}**.`,
          action,
        }
      }
      return { reply: 'Não encontrei o gráfico solicitado.', action: null }
    }
    case 'delete_item': {
      const itemTarget = String(params.item ?? params.target ?? '').trim()
      if (!itemTarget)
        return { reply: 'Por favor, informe qual item deseja remover da planilha.', action: null }

      const { workbook: targetWb, ambiguous } = findTargetWorkbook()
      if (ambiguous) return { reply: ambiguityReply(), action: null }
      if (!targetWb) return { reply: 'Não encontrei o arquivo especificado.', action: null }
      setAgentTargetWorkbookId(targetWb.id)

      const sheet = resolveSheet(targetWb)
      if (!sheet) return { reply: 'Não encontrei a aba especificada.', action: null }

      const lowerTarget = itemTarget.toLowerCase()
      const count = sheet.rows.filter((row) =>
        row.some((cell) => cell !== null && String(cell).toLowerCase().includes(lowerTarget)),
      ).length
      if (count === 0) {
        return {
          reply: `Não encontrei nenhum registro contendo "${itemTarget}" na aba **${sheet.name}** do arquivo **${targetWb.fileName}**.`,
          action: null,
        }
      }
      const newRows = sheet.rows.filter(
        (row) =>
          !row.some((cell) => cell !== null && String(cell).toLowerCase().includes(lowerTarget)),
      )
      const updatedSheet = { ...sheet, rows: newRows }
      const updatedWb = {
        ...targetWb,
        sheets: targetWb.sheets.map((s) => (s.id === sheet.id ? updatedSheet : s)),
      }
      setWorkbooks((prev) => prev.map((w) => (w.id === targetWb.id ? updatedWb : w)))
      persistWorkbookChange(updatedWb)

      if (targetWb.id === activeWorkbookId) {
        const gen = generateDashboard(updatedSheet)
        setComponents(gen.components)
        setLayout(gen.layout)
      }
      return {
        reply: `Sucesso! Removi **${count}** linha(s) contendo "**${itemTarget}**" da aba **${sheet.name}** no arquivo **${targetWb.fileName}**.`,
        action,
      }
    }
    case 'create_chart':
    case 'add_chart': {
      const title = String(params.title ?? 'Novo gráfico')
      const kind = normalizeKind(String(params.kind ?? 'bar'))

      const { workbook: targetWb, ambiguous } = findTargetWorkbook()
      if (ambiguous) return { reply: ambiguityReply(), action: null }
      if (!targetWb) return { reply: 'Não encontrei o arquivo especificado.', action: null }
      setAgentTargetWorkbookId(targetWb.id)

      const sheet = resolveSheet(targetWb)
      if (!sheet) return { reply: 'Não encontrei a aba especificada.', action: null }

      const tIdx = sheet.columns.findIndex((c) => c.type === 'text')
      const nIdx = sheet.columns.findIndex((c) => c.type === 'number' || c.type === 'currency')
      if (tIdx < 0 || nIdx < 0)
        return { reply: 'Não encontrei colunas suficientes para criar esse gráfico.', action: null }

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
      const newId = 'dash-' + uid()
      const newComp: DashComponent = {
        id: newId,
        kind,
        title,
        data,
        config: { currency: sheet.columns[nIdx].type === 'currency' },
      }

      if (targetWb.id === activeWorkbookId) {
        setLayout((prev) => {
          const maxY = prev.reduce((mx, l) => Math.max(mx, l.y + l.h), 0)
          return [...prev, { i: newId, x: 0, y: maxY, w: 5, h: 4 }]
        })
        setComponents((prev) => [...prev, newComp])
        setView('dashboard')
      } else {
        setActiveWorkbookId(targetWb.id)
        const gen = generateDashboard(sheet)
        const maxY = gen.layout.reduce((mx, l) => Math.max(mx, l.y + l.h), 0)
        setComponents([...gen.components, newComp])
        setLayout([...gen.layout, { i: newId, x: 0, y: maxY, w: 5, h: 4 }])
        setDashReady(true)
        setView('dashboard')
      }
      return {
        reply: `Pronto! Criei o gráfico **"${title}"** com os dados do arquivo **${targetWb.fileName}**.`,
        action,
      }
    }
    case 'remove_chart': {
      const target = String(params.title ?? params.target ?? '')
      const { workbook: targetWb, ambiguous } = findTargetWorkbook()
      if (ambiguous) return { reply: ambiguityReply(), action: null }
      if (!targetWb) return { reply: 'Não encontrei o arquivo especificado.', action: null }
      setAgentTargetWorkbookId(targetWb.id)

      if (targetWb.id !== activeWorkbookId) {
        return {
          reply: `Para remover um componente do arquivo **${targetWb.fileName}**, abra o arquivo primeiro e depois tente novamente.`,
          action: null,
        }
      }
      const comp = components.find(
        (c) => target && c.title.toLowerCase().includes(target.toLowerCase()),
      )
      if (comp) {
        setComponents((prev) => prev.filter((c) => c.id !== comp.id))
        setLayout((prev) => prev.filter((l) => l.i !== comp.id))
        return {
          reply: `Removi o componente **"${comp.title}"** do arquivo **${targetWb.fileName}**.`,
          action,
        }
      }
      return { reply: 'Não encontrei um componente com esse nome.', action: null }
    }
    case 'move_chart': {
      const target = String(params.title ?? params.target ?? '')
      const { workbook: targetWb, ambiguous } = findTargetWorkbook()
      if (ambiguous) return { reply: ambiguityReply(), action: null }
      if (!targetWb) return { reply: 'Não encontrei o arquivo especificado.', action: null }
      setAgentTargetWorkbookId(targetWb.id)
      const comp = components.find(
        (c) => target && c.title.toLowerCase().includes(target.toLowerCase()),
      )
      if (!comp) return { reply: 'Não encontrei o componente para mover.', action: null }
      return {
        reply: `Arraste **"${comp.title}"** pelo cabeçalho para reposicionar no arquivo **${targetWb.fileName}**.`,
        action,
      }
    }
    case 'add_kpi': {
      const title = String(params.title ?? 'Novo indicador')
      const value = String(params.value ?? '')
      const { workbook: targetWb, ambiguous } = findTargetWorkbook()
      if (ambiguous) return { reply: ambiguityReply(), action: null }
      if (!targetWb) return { reply: 'Não encontrei o arquivo especificado.', action: null }
      setAgentTargetWorkbookId(targetWb.id)

      const newId = 'dash-' + uid()
      const newComp: DashComponent = {
        id: newId,
        kind: 'kpi',
        title,
        data: [{ label: title, value: 0 }],
        config: { value: value || '—' },
      }

      if (targetWb.id === activeWorkbookId) {
        setLayout((prev) => {
          const maxY = prev.reduce((mx, l) => Math.max(mx, l.y + l.h), 0)
          return [...prev, { i: newId, x: 0, y: maxY, w: 5, h: 4 }]
        })
        setComponents((prev) => [...prev, newComp])
        setView('dashboard')
      } else {
        setActiveWorkbookId(targetWb.id)
        const sheet = resolveSheet(targetWb)
        if (sheet) {
          const gen = generateDashboard(sheet)
          const maxY = gen.layout.reduce((mx, l) => Math.max(mx, l.y + l.h), 0)
          setComponents([...gen.components, newComp])
          setLayout([...gen.layout, { i: newId, x: 0, y: maxY, w: 5, h: 4 }])
          setDashReady(true)
          setView('dashboard')
        }
      }
      return {
        reply: `Adicionei o indicador **"${title}"** ao dashboard do arquivo **${targetWb.fileName}**.`,
        action,
      }
    }
    case 'create_sheet': {
      const name = String(params.name ?? params.title ?? 'Nova aba')
      const { workbook: targetWb, ambiguous } = findTargetWorkbook()
      if (ambiguous) return { reply: ambiguityReply(), action: null }
      if (!targetWb) return { reply: 'Não encontrei o arquivo especificado.', action: null }
      setAgentTargetWorkbookId(targetWb.id)

      const ns: SheetData = {
        id: 'sheet-' + uid(),
        name,
        columns: [{ name: 'Coluna A', type: 'text' }],
        rows: [],
      }
      const updatedWb = { ...targetWb, sheets: [...targetWb.sheets, ns], activeSheetId: ns.id }
      setWorkbooks((prev) => prev.map((w) => (w.id === targetWb.id ? updatedWb : w)))
      persistWorkbookChange(updatedWb)

      if (targetWb.id !== activeWorkbookId) {
        setActiveWorkbookId(targetWb.id)
      }
      setView('sheet')
      return {
        reply: `Criei a nova aba **"${name}"** no arquivo **${targetWb.fileName}**.`,
        action,
      }
    }
    case 'edit_filter': {
      const filterAction = String(params.filterAction || 'add') as 'add' | 'replace' | 'remove'
      const field = String(params.field || '').trim()
      const op = String(params.op || 'eq') as ComponentFilter['op']
      const value = String(params.value || '').trim()
      const title = String(params.title ?? '').trim()

      const { workbook: targetWb, ambiguous } = findTargetWorkbook()
      if (ambiguous) return { reply: ambiguityReply(), action: null }
      if (!targetWb) return { reply: 'Não encontrei o arquivo especificado.', action: null }
      setAgentTargetWorkbookId(targetWb.id)

      let targetComp = components.find(
        (c) => title && c.title.toLowerCase().includes(title.toLowerCase()),
      )
      if (!targetComp && selectedComponentId) {
        targetComp = components.find((c) => c.id === selectedComponentId)
      }
      if (!targetComp) {
        return {
          reply:
            'Não encontrei o componente. Por favor, selecione um componente no dashboard ou informe seu nome.',
          action: null,
        }
      }
      const comp = targetComp

      const sourceSheetId = (comp.config?.sourceSheetId as string) || targetWb.activeSheetId
      const sheet = targetWb.sheets.find((s) => s.id === sourceSheetId) ?? targetWb.sheets[0]
      if (!sheet) return { reply: 'Não encontrei a aba de dados do componente.', action: null }

      const columns = sheet.columns || []
      const config = comp.config || {}
      const existingFilters = (config.filters as ComponentFilter[]) || []

      if (filterAction === 'remove') {
        if (!field) {
          const newConfig = { ...config, filters: [] }
          const updated = recomputeComponentData({ ...comp, config: newConfig }, sheet)
          setComponents((prev) => prev.map((c) => (c.id === comp.id ? updated : c)))
          return {
            reply: `Removi todos os filtros do componente **"${comp.title}"** no arquivo **${targetWb.fileName}**.`,
            action,
          }
        }
        const newFilters = existingFilters.filter(
          (f) => f.field.toLowerCase() !== field.toLowerCase(),
        )
        const newConfig = { ...config, filters: newFilters }
        const updated = recomputeComponentData({ ...comp, config: newConfig }, sheet)
        setComponents((prev) => prev.map((c) => (c.id === comp.id ? updated : c)))
        return {
          reply: `Removi o filtro do campo **"${field}"** do componente **"${comp.title}"** no arquivo **${targetWb.fileName}**.`,
          action,
        }
      }

      if (!field) {
        return { reply: 'Por favor, informe o nome do campo para filtrar.', action: null }
      }
      if (!validateFieldExists(columns, field)) {
        const available = getAvailableFields(columns)
        return {
          reply: `O campo **"${field}"** não existe nos dados do arquivo **${targetWb.fileName}**. Campos disponíveis: ${available.map((f) => `**${f}**`).join(', ')}. Por favor, escolha um dos campos listados.`,
          action: null,
        }
      }

      const newFilter: ComponentFilter = { field, op, value }
      let newFilters: ComponentFilter[]
      if (filterAction === 'replace') {
        newFilters = [newFilter]
      } else {
        newFilters = [
          ...existingFilters.filter((f) => f.field.toLowerCase() !== field.toLowerCase()),
          newFilter,
        ]
      }

      const newConfig = { ...config, filters: newFilters }
      const updated = recomputeComponentData({ ...comp, config: newConfig }, sheet)
      setComponents((prev) => prev.map((c) => (c.id === comp.id ? updated : c)))

      const opLabels: Record<string, string> = {
        eq: 'igual a',
        neq: 'diferente de',
        contains: 'contendo',
        gt: 'maior que',
        lt: 'menor que',
        gte: 'maior ou igual a',
        lte: 'menor ou igual a',
      }
      return {
        reply: `Filtro aplicado no componente **"${comp.title}"** no arquivo **${targetWb.fileName}**: **${field}** ${opLabels[op] || op} **${value}**.`,
        action,
      }
    }
    case 'edit_axis': {
      const dimension = String(params.dimension ?? '').trim()
      const metric = String(params.metric ?? '').trim()
      const title = String(params.title ?? '').trim()

      const { workbook: targetWb, ambiguous } = findTargetWorkbook()
      if (ambiguous) return { reply: ambiguityReply(), action: null }
      if (!targetWb) return { reply: 'Não encontrei o arquivo especificado.', action: null }
      setAgentTargetWorkbookId(targetWb.id)

      let targetComp = components.find(
        (c) => title && c.title.toLowerCase().includes(title.toLowerCase()),
      )
      if (!targetComp && selectedComponentId) {
        targetComp = components.find((c) => c.id === selectedComponentId)
      }
      if (!targetComp) {
        return {
          reply:
            'Não encontrei o componente. Por favor, selecione um componente no dashboard ou informe seu nome.',
          action: null,
        }
      }
      const comp = targetComp

      if (comp.kind === 'kpi') {
        return {
          reply:
            'Não é possível alterar eixos de um indicador (KPI). Use um gráfico de barras, linhas, pizza, ranking ou tabela.',
          action: null,
        }
      }

      const sourceSheetId = (comp.config?.sourceSheetId as string) || targetWb.activeSheetId
      const sheet = targetWb.sheets.find((s) => s.id === sourceSheetId) ?? targetWb.sheets[0]
      if (!sheet) return { reply: 'Não encontrei a aba de dados do componente.', action: null }

      const columns = sheet.columns || []
      const config = comp.config || {}

      if (dimension && !validateFieldExists(columns, dimension)) {
        const available = getAvailableFields(columns)
        return {
          reply: `O campo **"${dimension}"** não existe nos dados do arquivo **${targetWb.fileName}**. Campos disponíveis: ${available.map((f) => `**${f}**`).join(', ')}.`,
          action: null,
        }
      }

      if (metric && !validateFieldExists(columns, metric)) {
        const available = getAvailableFields(columns)
        return {
          reply: `O campo **"${metric}"** não existe nos dados do arquivo **${targetWb.fileName}**. Campos disponíveis: ${available.map((f) => `**${f}**`).join(', ')}.`,
          action: null,
        }
      }

      const newConfig = {
        ...config,
        ...(dimension ? { dimensionCol: dimension } : {}),
        ...(metric ? { metricCol: metric } : {}),
      }
      const updated = recomputeComponentData({ ...comp, config: newConfig }, sheet)
      setComponents((prev) => prev.map((c) => (c.id === comp.id ? updated : c)))

      const changes: string[] = []
      if (dimension) changes.push(`dimensão (eixo X) para **${dimension}**`)
      if (metric) changes.push(`métrica (eixo Y) para **${metric}**`)
      return {
        reply: `Alterei ${changes.join(' e ')} no componente **"${comp.title}"** no arquivo **${targetWb.fileName}**.`,
        action,
      }
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
