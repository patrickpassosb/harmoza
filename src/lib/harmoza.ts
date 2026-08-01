/* HARMOZA — Tipos e lógica de dados
   Tipos de planilha, colunas, heurística de dashboard e motor de ações. */

export type ColumnType = 'text' | 'number' | 'currency' | 'percentage' | 'date'

export interface Column {
  name: string
  type: ColumnType
}

export interface Sheet {
  name: string
  columns: Column[]
  rows: Record<string, unknown>[]
}

export interface Workbook {
  id: string
  name: string
  fileName: string
  sheets: Sheet[]
}

export type KpiType = 'currency' | 'number' | 'percentage'

export type WidgetKind = 'kpi' | 'bar' | 'line' | 'area' | 'pie' | 'ranking' | 'table' | 'trend'

export interface Widget {
  id: string
  kind: WidgetKind
  title: string
  kpiType?: KpiType
  x: number
  y: number
  w: number
  h: number
  data?: {
    labels?: string[]
    values?: number[]
    series?: { name: string; values: number[] }[]
    rows?: Record<string, unknown>[]
    kpiValue?: number
    kpiDelta?: number
    kpiDeltaLabel?: string
    kpiPrefix?: string
    kpiSuffix?: string
  }
}

export interface DashboardState {
  widgets: Widget[]
}

/* Converte qualquer valor para string de forma segura */
export function safeString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/* Extrai o nome da coluna de forma defensiva */
export function getColName(c: unknown): string {
  if (!c) return ''
  if (typeof c === 'string') return c
  if (typeof c === 'object' && 'name' in c) return safeString((c as { name: unknown }).name)
  return safeString(c)
}

/* ------------------------------------------------------------------ */
/* Inferência de tipo de coluna a partir dos valores                   */
/* ------------------------------------------------------------------ */

export function inferColumnType(name: unknown, values: unknown[]): ColumnType {
  const norm = safeString(name).toLowerCase()
  if (/(data|date|dia|mês|mes|periodo|período|when)/.test(norm)) {
    const sample = (values || [])
      .filter((v) => v !== null && v !== '' && v !== undefined)
      .slice(0, 8)
    if (sample.length > 0 && sample.every((v) => looksLikeDate(safeString(v)))) return 'date'
  }
  if (
    /(preco|preço|valor|receita|venda|custo|lucro|total|price|amount|revenue|cost|profit|budget|saldo|desconto|preco_unitario)/.test(
      norm,
    )
  ) {
    const sample = (values || []).filter((v) => v !== null && v !== '' && v !== undefined)
    if (sample.length > 0 && sample.every((v) => isNumeric(safeString(v)))) return 'currency'
  }
  if (/(percent|%|taxa|rate|margem|comissão|comissao)/.test(norm)) {
    const sample = (values || []).filter((v) => v !== null && v !== '' && v !== undefined)
    if (sample.length > 0 && sample.every((v) => isNumeric(safeString(v)))) return 'percentage'
  }
  if (/(qtd|quant|qtde|quantidade|numero|número|count|amount|idade|estoque|unidades)/.test(norm)) {
    const sample = (values || []).filter((v) => v !== null && v !== '' && v !== undefined)
    if (sample.length > 0 && sample.every((v) => isNumeric(safeString(v)))) return 'number'
  }
  return 'text'
}

export function looksLikeDate(v: string): boolean {
  if (!v) return false
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(v) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(v)
}

export function isNumeric(v: string): boolean {
  if (!v || v.trim() === '') return false
  const cleaned = v.replace(/[R$\s.]/g, '').replace(',', '.')
  return !isNaN(Number(cleaned)) && cleaned.trim() !== ''
}

export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return isNaN(v) ? null : v
  if (typeof v === 'string') {
    if (!v.trim()) return null
    const cleaned = v.replace(/[R$\s.]/g, '').replace(',', '.')
    const n = Number(cleaned)
    return isNaN(n) ? null : n
  }
  return null
}

export function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  const s = safeString(v)
  if (!s) return null
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000) {
      const d = new Date(Math.round((v - 25569) * 86400 * 1000))
      return isNaN(d.getTime()) ? null : d
    }
    return null
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const dd = parseInt(m[1], 10)
    const mm = parseInt(m[2], 10)
    const yy = parseInt(m[3], 10)
    return new Date(yy < 100 ? 2000 + yy : yy, mm - 1, dd)
  }
  return null
}

export function monthKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map((x) => parseInt(x, 10))
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return names[(m || 1) - 1] + '/' + String(y).slice(2)
}

export function currency(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return n.toLocaleString('pt-BR')
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return (n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
}

/* ------------------------------------------------------------------ */
/* Heurística: gera widgets com base nas colunas reais                 */
/* ------------------------------------------------------------------ */

export interface DashboardContext {
  sheet: Sheet
  sheetIndex: number
}

function groupSum(
  rows: Record<string, unknown>[],
  key: string,
  val: string,
): { labels: string[]; values: number[] } {
  const map = new Map<string, number>()
  for (const r of rows || []) {
    if (!r) continue
    const k = safeString(r[key] ?? '—') || '—'
    const v = parseNumber(r[val]) ?? 0
    map.set(k, (map.get(k) ?? 0) + v)
  }
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1])
  return { labels: entries.map((e) => e[0]), values: entries.map((e) => e[1]) }
}

export function generateDashboard(sheet: Sheet, sheetIndex: number): DashboardState {
  const widgets: Widget[] = []
  const rows = sheet.rows || []
  const cols = sheet.columns || []

  const findCol = (re: RegExp) => cols.find((c) => re.test(getColName(c).toLowerCase()))

  let y = 0
  const add = (w: Omit<Widget, 'y'>) => {
    widgets.push({ ...w, y: y++, x: w.x, w: w.w, h: w.h })
  }

  const currencyCol = findCol(/receita|venda|faturamento|revenue|total/i)
  const profitCol = findCol(/lucro|profit/i)
  const qtyCol = findCol(/qtd|quant|qtde|quantidade|unidades/i)
  const dateCol = findCol(/data|date/i)
  const categoryCol = findCol(/categoria|category/i)
  const productCol = findCol(/produto|product|item/i)
  const regionCol = findCol(/região|regiao|region|estado|uf/i)
  const clientCol = findCol(/cliente|customer|client/i)
  const statusCol = findCol(/status|situação|situacao|estado do pedido/i)

  const sumCol = (c?: Column) =>
    c ? rows.reduce((acc, r) => acc + (parseNumber(r[c.name]) ?? 0), 0) : 0
  const revenue = sumCol(currencyCol)
  const profit = sumCol(profitCol)

  // KPI: Receita total
  if (currencyCol && revenue > 0) {
    add({
      id: 'kpi-receita',
      kind: 'kpi',
      title: 'Receita total',
      kpiType: 'currency',
      x: 0,
      w: 3,
      h: 1,
      data: { kpiValue: revenue },
    })
  }
  // KPI: Lucro total
  if (profitCol && profit > 0) {
    add({
      id: 'kpi-lucro',
      kind: 'kpi',
      title: 'Lucro total',
      kpiType: 'currency',
      x: 3,
      w: 3,
      h: 1,
      data: { kpiValue: profit },
    })
  }
  // KPI: Ticket médio
  if (currencyCol && rows.length > 0) {
    add({
      id: 'kpi-ticket',
      kind: 'kpi',
      title: 'Ticket médio',
      kpiType: 'currency',
      x: 6,
      w: 3,
      h: 1,
      data: { kpiValue: revenue / rows.length },
    })
  }
  // KPI: Pedidos
  add({
    id: 'kpi-pedidos',
    kind: 'kpi',
    title: 'Pedidos',
    kpiType: 'number',
    x: 9,
    w: 3,
    h: 1,
    data: { kpiValue: rows.length },
  })

  // Receita por mês (linha)
  if (currencyCol && dateCol) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const d = parseDate(r[dateCol.name])
      const k = d ? monthKey(d) : safeString(r[dateCol.name])
      map.set(k, (map.get(k) ?? 0) + (parseNumber(r[currencyCol.name]) ?? 0))
    }
    const sorted = [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    add({
      id: 'chart-mes',
      kind: 'line',
      title: 'Receita por mês',
      x: 0,
      w: 6,
      h: 3,
      data: { labels: sorted.map((e) => monthLabel(e[0])), values: sorted.map((e) => e[1]) },
    })
  }

  // Vendas por categoria (pizza)
  if (currencyCol && categoryCol) {
    const g = groupSum(rows, categoryCol.name, currencyCol.name)
    add({
      id: 'chart-categoria',
      kind: 'pie',
      title: 'Vendas por categoria',
      x: 6,
      w: 3,
      h: 3,
      data: { labels: g.labels.slice(0, 8), values: g.values.slice(0, 8) },
    })
  }

  // Ranking de produtos
  if (currencyCol && productCol) {
    const g = groupSum(rows, productCol.name, currencyCol.name)
    add({
      id: 'ranking-produtos',
      kind: 'ranking',
      title: 'Ranking de produtos',
      x: 9,
      w: 3,
      h: 3,
      data: { labels: g.labels.slice(0, 8), values: g.values.slice(0, 8) },
    })
  }

  // Vendas por região (barra)
  if (currencyCol && regionCol) {
    const g = groupSum(rows, regionCol.name, currencyCol.name)
    add({
      id: 'chart-regiao',
      kind: 'bar',
      title: 'Vendas por região',
      x: 0,
      w: 4,
      h: 3,
      data: { labels: g.labels, values: g.values },
    })
  }

  // Pedidos por status (barra)
  if (statusCol) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const k = safeString(r[statusCol.name] ?? '—') || '—'
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    add({
      id: 'chart-status',
      kind: 'bar',
      title: 'Pedidos por status',
      x: 4,
      w: 4,
      h: 3,
      data: { labels: [...map.keys()], values: [...map.values()] },
    })
  }

  // Tabela de clientes
  if (currencyCol && clientCol) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const k = safeString(r[clientCol.name] ?? '—') || '—'
      map.set(k, (map.get(k) ?? 0) + (parseNumber(r[currencyCol.name]) ?? 0))
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    add({
      id: 'tabela-clientes',
      kind: 'table',
      title: 'Clientes por valor',
      x: 4,
      w: 8,
      h: 3,
      data: {
        labels: sorted.map((e) => e[0]),
        values: sorted.map((e) => e[1]),
        rows: sorted.map((e) => ({ Cliente: e[0], 'Total (R$)': e[1] })),
      },
    })
  }

  // Indicador de tendência (lucro mês a mês)
  if (profitCol && dateCol) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const d = parseDate(r[dateCol.name])
      const k = d ? monthKey(d) : safeString(r[dateCol.name])
      map.set(k, (map.get(k) ?? 0) + (parseNumber(r[profitCol.name]) ?? 0))
    }
    const sorted = [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    add({
      id: 'chart-lucro-mes',
      kind: 'area',
      title: 'Lucro por mês',
      x: 0,
      w: 6,
      h: 3,
      data: { labels: sorted.map((e) => monthLabel(e[0])), values: sorted.map((e) => e[1]) },
    })
  }

  return { widgets }
}

/* ------------------------------------------------------------------ */
/* Motor de ações do agente (executa no estado real)                   */
/* ------------------------------------------------------------------ */

export interface AgentActionContext {
  sheets: Sheet[]
  setSheets: (s: Sheet[]) => void
  activeSheetIndex: number
  setActiveSheetIndex: (i: number) => void
  dashboard: DashboardState
  setDashboard: (d: DashboardState) => void
}

export function buildAgentContext(
  sheets: Sheet[],
  setSheets: (s: Sheet[]) => void,
  activeSheetIndex: number,
  setActiveSheetIndex: (i: number) => void,
  dashboard: DashboardState,
  setDashboard: (d: DashboardState) => void,
): AgentActionContext {
  return { sheets, setSheets, activeSheetIndex, setActiveSheetIndex, dashboard, setDashboard }
}

let widgetSeq = 100

export function applyAgentAction(
  ctx: AgentActionContext,
  action: string | null,
  params: Record<string, unknown>,
): string {
  if (!action) return ''
  const p = params || {}
  try {
    switch (action) {
      case 'create_chart': {
        const kind = String(p.kind || 'bar') as WidgetKind
        const title = String(p.title || 'Novo gráfico')
        const labels = Array.isArray(p.labels) ? (p.labels as string[]) : []
        const values = Array.isArray(p.values) ? (p.values as number[]) : []
        const widget: Widget = {
          id: 'widget-' + widgetSeq++,
          kind: ['bar', 'line', 'area', 'pie', 'ranking'].includes(kind) ? kind : 'bar',
          title,
          x: 0,
          y: 99,
          w: kind === 'pie' ? 4 : 6,
          h: 3,
          data: { labels, values },
        }
        ctx.setDashboard({ widgets: [...ctx.dashboard.widgets, widget] })
        return 'Gráfico criado: ' + title
      }
      case 'remove_chart': {
        const title = String(p.title || '')
        const id = String(p.id || '')
        const widgets = ctx.dashboard.widgets.filter(
          (w) =>
            !(id && w.id === id) && !(title && w.title.toLowerCase().includes(title.toLowerCase())),
        )
        ctx.setDashboard({ widgets })
        return 'Removido: ' + (title || 'componente')
      }
      case 'move_chart': {
        const title = String(p.title || '')
        const position = String(p.position || 'top')
        const target = ctx.dashboard.widgets.find(
          (w) => title && w.title.toLowerCase().includes(title.toLowerCase()),
        )
        if (!target) return 'Não encontrei o componente "' + title + '"'
        const others = ctx.dashboard.widgets.filter((w) => w.id !== target.id)
        let y = 0
        if (position === 'bottom') y = others.length
        const moved = { ...target, y }
        ctx.setDashboard({ widgets: [...others, moved] })
        return 'Movido para o topo: ' + target.title
      }
      case 'add_kpi': {
        const title = String(p.title || 'Indicador')
        const kpiType = (String(p.kpiType || 'currency') as KpiType) || 'currency'
        const value = typeof p.value === 'number' ? p.value : 0
        ctx.setDashboard({
          widgets: [
            ...ctx.dashboard.widgets,
            {
              id: 'widget-' + widgetSeq++,
              kind: 'kpi',
              title,
              kpiType,
              x: 0,
              y: 99,
              w: 3,
              h: 1,
              data: { kpiValue: value },
            },
          ],
        })
        return 'Indicador adicionado: ' + title
      }
      case 'create_sheet': {
        const name = String(p.name || 'Nova aba')
        if (ctx.sheets.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
          return 'Já existe uma aba chamada "' + name + '"'
        }
        const newSheet: Sheet = { name, columns: [], rows: [] }
        ctx.setSheets([...ctx.sheets, newSheet])
        ctx.setActiveSheetIndex(ctx.sheets.length)
        return 'Aba criada: ' + name
      }
      default:
        return ''
    }
  } catch (err) {
    return 'Erro ao executar ação: ' + String(err)
  }
}

export function findAgentColumn(sheet: Sheet, re: RegExp): Column | undefined {
  return (sheet.columns || []).find((c) => re.test(getColName(c).toLowerCase()))
}
