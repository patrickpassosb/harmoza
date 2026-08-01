// HARMOZA — tipos centrais

export type CellValue = string | number | boolean | Date | null

export interface ColumnInfo {
  name: string
  type: 'text' | 'number' | 'currency' | 'percent' | 'date'
  // amostra de valores para preview/detecção
  sample: CellValue[]
}

export interface Sheet {
  id: string
  name: string
  columns: string[] // cabeçalhos
  rows: CellValue[][] // dados (sem cabeçalho)
  columnTypes: Record<string, ColumnInfo['type']>
}

export type DashChartType = 'kpi' | 'bar' | 'line' | 'pie' | 'table' | 'ranking'

export interface DashComponent {
  id: string
  type: DashChartType
  title: string
  // config de origem (coluna etc.)
  columnX?: string
  columnY?: string
  aggregation?: 'sum' | 'avg' | 'count'
  format?: 'currency' | 'number' | 'percent' | 'date'
  // dados pré-calculados para render (labels + values)
  labels?: string[]
  values?: number[]
  rows?: { label: string; value: number; extra?: string }[]
}

export interface DashboardLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export interface WorkBookState {
  fileName: string
  sheets: Sheet[]
  activeSheetId: string
  dashboard: DashComponent[]
  layout: DashboardLayoutItem[]
  // metadados de análise (para o agente)
  analysis?: {
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
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  // ação executada (para o agente mostrar o que mudou)
  action?: string
  createdAt: number
}

export type AgentState = 'idle' | 'listening' | 'processing' | 'executing' | 'done' | 'error'

export interface AgentResult {
  action: string
  params: Record<string, unknown>
  reply: string
}
