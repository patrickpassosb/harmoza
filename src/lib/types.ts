// HARMOZA — tipos centrais da aplicação (compatível com AppShell/analyze/excel)

export type CellValue = string | number | null
export type ColumnType = 'text' | 'number' | 'currency' | 'percent' | 'date'

export interface ColumnMeta {
  name: string
  type: ColumnType
}

export interface Sheet {
  id: string
  name: string
  columns: string[] // nomes das colunas
  rows: CellValue[][]
  columnTypes?: Record<string, string> // nome da coluna -> tipo detectado
}

export type DashKind = 'kpi' | 'bar' | 'line' | 'area' | 'pie' | 'ranking' | 'table'

export interface DashComponent {
  id: string
  type: DashKind
  title: string
  columnX?: string
  columnY?: string
  aggregation?: 'sum' | 'avg' | 'count'
  format?: 'currency' | 'number' | 'percent'
  labels?: string[]
  values?: number[]
  rows?: { label: string; value: number }[]
  config?: Record<string, unknown>
}

export interface DashboardLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export interface Analysis {
  totalRevenue?: number
  totalProfit?: number
  avgTicket?: number
  orderCount?: number
  monthlyRevenue?: { label: string; value: number }[]
  categoryRevenue?: { label: string; value: number }[]
  topProducts?: { label: string; value: number }[]
  topClients?: { label: string; value: number }[]
  regionRevenue?: { label: string; value: number }[]
  statusCounts?: { label: string; value: number }[]
  hasRevenue: boolean
  hasProfit: boolean
  hasDate: boolean
}

export interface WorkBookState {
  fileName: string
  sheets: Sheet[]
  activeSheetId: string
  dashboard: DashComponent[]
  layout: DashboardLayoutItem[]
  analysis?: Analysis
}

export interface AgentResult {
  reply: string
  action: string | null
  params: Record<string, unknown>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: string
  createdAt: number
}

export type ViewMode = 'sheet' | 'dashboard'
