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
export type DashKind = 'kpi' | 'bar' | 'line' | 'pie' | 'table' | 'ranking'
export interface DashComponent {
  id: string
  kind: DashKind
  title: string
  subtitle?: string
  data?: { label: string; value: number }[]
  config: Record<string, unknown>
}
export interface DashLayoutItem {
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
