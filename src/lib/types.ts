// HARMOZA — tipos centrais da aplicação
// (compatível com harmoza.ts + componentes)

export type ColumnType = 'text' | 'number' | 'currency' | 'percent' | 'date'

export interface ColumnMeta {
  name: string
  type: ColumnType
}

export type CellValue = string | number | null

export interface SheetData {
  id: string
  name: string
  columns: ColumnMeta[]
  rows: CellValue[][]
}

export interface Workbook {
  id: string
  fileName: string
  sheets: SheetData[]
  activeSheetId: string
}

export type DashKind = 'kpi' | 'bar' | 'line' | 'area' | 'pie' | 'ranking' | 'table'

export interface DashComponent {
  id: string
  kind: DashKind
  type?: DashKind
  title: string
  subtitle?: string
  // dados agregados prontos para render
  labels?: string[]
  values?: number[]
  rows?: { label: string; value: number }[]
  columnX?: string
  columnY?: string
  aggregation?: 'sum' | 'avg' | 'count'
  format?: 'currency' | 'number' | 'percent'
  config: Record<string, unknown>
}

export interface DashboardLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export type ViewMode = 'sheet' | 'dashboard'

export type ImportState = 'idle' | 'loading' | 'success' | 'error'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: string
  created: number
}

export type AgentStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'executing'
  | 'done'
  | 'unclear'
  | 'error'

// --- compat com harmoza.ts ---
export interface Sheet {
  name: string
  columns: ColumnMeta[]
  rows: Record<string, unknown>[]
}

export interface AgentState {
  open: boolean
  messages: ChatMessage[]
  status: AgentStatus
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}
