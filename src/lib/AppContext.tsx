/* HARMOZA — Estado global (Context + reducer)
   Centraliza: workbook (abas), aba ativa, dashboard, modo (planilha/dashboard),
   histórico do agente. Persiste em localStorage durante a sessão. */

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { DashboardState, Sheet, Workbook } from '@/lib/harmoza'

export type ViewMode = 'sheet' | 'dashboard'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface AppState {
  workbook: Workbook | null
  sheets: Sheet[]
  activeSheetIndex: number
  dashboard: DashboardState
  mode: ViewMode
  saved: boolean
  agentOpen: boolean
  agentHistory: AgentMessage[]
}

type Action =
  | { type: 'SET_WORKBOOK'; workbook: Workbook | null }
  | { type: 'SET_SHEETS'; sheets: Sheet[]; active?: number }
  | { type: 'SET_ACTIVE_SHEET'; index: number }
  | { type: 'SET_DASHBOARD'; dashboard: DashboardState }
  | { type: 'SET_MODE'; mode: ViewMode }
  | { type: 'SET_SAVED'; saved: boolean }
  | { type: 'SET_AGENT_OPEN'; open: boolean }
  | { type: 'ADD_AGENT_MESSAGE'; message: AgentMessage }
  | { type: 'RESET' }

const initialState: AppState = {
  workbook: null,
  sheets: [],
  activeSheetIndex: 0,
  dashboard: { widgets: [] },
  mode: 'sheet',
  saved: true,
  agentOpen: false,
  agentHistory: [],
}

const STORAGE_KEY = 'harmoza-state-v1'

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      ...initialState,
      ...parsed,
      workbook: parsed.workbook ?? null,
      sheets: parsed.sheets ?? [],
      dashboard: parsed.dashboard ?? { widgets: [] },
      agentHistory: parsed.agentHistory ?? [],
      saved: true,
    }
  } catch {
    return initialState
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_WORKBOOK':
      return {
        ...state,
        workbook: action.workbook,
        sheets: action.workbook ? action.workbook.sheets : [],
        activeSheetIndex: 0,
        saved: false,
      }
    case 'SET_SHEETS':
      return {
        ...state,
        sheets: action.sheets,
        activeSheetIndex:
          action.active ?? Math.min(state.activeSheetIndex, Math.max(0, action.sheets.length - 1)),
        saved: false,
      }
    case 'SET_ACTIVE_SHEET':
      return { ...state, activeSheetIndex: action.index, saved: false }
    case 'SET_DASHBOARD':
      return { ...state, dashboard: action.dashboard, saved: false }
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    case 'SET_SAVED':
      return { ...state, saved: action.saved }
    case 'SET_AGENT_OPEN':
      return { ...state, agentOpen: action.open }
    case 'ADD_AGENT_MESSAGE':
      return { ...state, agentHistory: [...state.agentHistory, action.message], saved: false }
    case 'RESET':
      return { ...initialState, agentHistory: state.agentHistory }
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  hasData: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage cheio/indisponível — segue sem persistir */
    }
  }, [state])

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch,
      hasData: state.sheets.length > 0 && state.sheets.some((s) => s.rows.length > 0),
    }),
    [state],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
