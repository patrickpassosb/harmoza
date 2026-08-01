// HARMOZA — análise de dados e geração automática de dashboard (heurística por colunas)

import type { CellValue, DashComponent, DashboardLayoutItem, Sheet } from './types'

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

function safeString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function num(v: CellValue | unknown): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v
  if (typeof v === 'string') {
    if (!v.trim()) return 0
    const n = parseFloat(v.replace(/[R$\s.]/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function getColName(c: unknown): string {
  if (!c) return ''
  if (typeof c === 'string') return c
  if (typeof c === 'object' && 'name' in c) return safeString((c as { name: unknown }).name)
  return safeString(c)
}

function getCell(r: unknown, colName: string, cols: unknown[]): unknown {
  if (!r) return null
  if (Array.isArray(r)) {
    const idx = cols.findIndex((c) => getColName(c).toLowerCase() === colName.toLowerCase())
    return idx >= 0 ? r[idx] : null
  }
  if (typeof r === 'object') {
    const rec = r as Record<string, unknown>
    if (colName in rec) return rec[colName]
    const matchKey = Object.keys(rec).find((k) => k.toLowerCase() === colName.toLowerCase())
    return matchKey ? rec[matchKey] : null
  }
  return null
}

export function analyzeSheet(sheet: Sheet): Analysis {
  const cols = sheet.columns || []
  const rows = sheet.rows || []

  const findCol = (names: string[]) =>
    cols.find((c) => {
      const cn = getColName(c).toLowerCase()
      return names.some((n) => cn.includes(n.toLowerCase()))
    })

  const revenueCol = findCol([
    'receita',
    'receita total',
    'vendas',
    'faturamento',
    'valor total',
    'valor',
  ])
  const profitCol = findCol(['lucro', 'margem', 'resultado'])
  const dateCol = findCol(['data', 'dia', 'mês', 'mes', 'competência'])
  const categoryCol = findCol(['categoria', 'departamento', 'segmento', 'grupo'])
  const productCol = findCol(['produto', 'item', 'sku', 'nome', 'descrição', 'descricao'])
  const clientCol = findCol(['cliente', 'client', 'razão social', 'razao social'])
  const regionCol = findCol(['região', 'regiao', 'estado', 'uf', 'cidade'])
  const statusCol = findCol(['status', 'situação', 'situacao', 'estado do pedido'])
  const qtyCol = findCol(['quantidade', 'qtd', 'qtde', 'unidades'])

  const revenueColName = getColName(revenueCol)
  const profitColName = getColName(profitCol)
  const dateColName = getColName(dateCol)
  const categoryColName = getColName(categoryCol)
  const productColName = getColName(productCol)
  const clientColName = getColName(clientCol)
  const regionColName = getColName(regionCol)
  const statusColName = getColName(statusCol)
  const qtyColName = getColName(qtyCol)

  const revenue = revenueColName
    ? rows.reduce((s, r) => s + num(getCell(r, revenueColName, cols)), 0)
    : undefined
  const profit = profitColName
    ? rows.reduce((s, r) => s + num(getCell(r, profitColName, cols)), 0)
    : undefined
  const orderCount = rows.length

  const analysis: Analysis = {
    totalRevenue: revenue,
    totalProfit: profit,
    orderCount,
    hasRevenue: !!revenueColName,
    hasProfit: !!profitColName,
    hasDate: !!dateColName,
  }
  if (revenue !== undefined && orderCount > 0) analysis.avgTicket = revenue / orderCount

  if (dateColName) {
    const byMonth = new Map<string, number>()
    for (const r of rows) {
      const raw = safeString(getCell(r, dateColName, cols))
      let key = raw
      const d = new Date(raw)
      if (!Number.isNaN(d.getTime()))
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      else {
        const m = raw.match(/(\d{4})[-/](\d{1,2})/)
        if (m) key = `${m[1]}-${String(Number(m[2])).padStart(2, '0')}`
      }
      const val = revenueColName ? num(getCell(r, revenueColName, cols)) : 1
      byMonth.set(key, (byMonth.get(key) || 0) + val)
    }
    analysis.monthlyRevenue = [...byMonth.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([label, value]) => ({
        label: label.length >= 7 ? label.slice(0, 4) + '/' + label.slice(5, 7) : label,
        value,
      }))
  }

  if (categoryColName && revenueColName) {
    const byCat = new Map<string, number>()
    for (const r of rows) {
      const k = safeString(getCell(r, categoryColName, cols)) || 'Sem categoria'
      byCat.set(k, (byCat.get(k) || 0) + num(getCell(r, revenueColName, cols)))
    }
    analysis.categoryRevenue = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  }

  if (productColName) {
    const byProd = new Map<string, number>()
    const metricColName = revenueColName || qtyColName
    for (const r of rows) {
      const k = safeString(getCell(r, productColName, cols)) || 'Sem produto'
      byProd.set(
        k,
        (byProd.get(k) || 0) + (metricColName ? num(getCell(r, metricColName, cols)) : 1),
      )
    }
    analysis.topProducts = [...byProd.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }))
  }

  if (clientColName && revenueColName) {
    const byClient = new Map<string, number>()
    for (const r of rows) {
      const k = safeString(getCell(r, clientColName, cols)) || 'Sem cliente'
      byClient.set(k, (byClient.get(k) || 0) + num(getCell(r, revenueColName, cols)))
    }
    analysis.topClients = [...byClient.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }))
  }

  if (regionColName && revenueColName) {
    const byRegion = new Map<string, number>()
    for (const r of rows) {
      const k = safeString(getCell(r, regionColName, cols)) || 'Sem região'
      byRegion.set(k, (byRegion.get(k) || 0) + num(getCell(r, regionColName, cols)))
    }
    analysis.regionRevenue = [...byRegion.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  }

  if (statusColName) {
    const byStatus = new Map<string, number>()
    for (const r of rows) {
      const k = safeString(getCell(r, statusColName, cols)) || 'Sem status'
      byStatus.set(k, (byStatus.get(k) || 0) + 1)
    }
    analysis.statusCounts = [...byStatus.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  }

  return analysis
}

export function buildDashboard(
  sheet: Sheet,
  analysis: Analysis,
): { components: DashComponent[]; layout: DashboardLayoutItem[] } {
  const components: DashComponent[] = []
  const layout: DashboardLayoutItem[] = []
  let y = 0
  const add = (c: DashComponent, w: number, h: number, x = 0) => {
    components.push(c)
    layout.push({ i: c.id, x, y, w, h })
    y += h
  }

  if (analysis.totalRevenue !== undefined) {
    add(
      {
        id: 'cmp-kpi-revenue',
        kind: 'kpi',
        title: 'Receita total',
        config: { currency: true, aggregation: 'sum' },
        data: [{ label: 'Receita total', value: analysis.totalRevenue }],
      },
      3,
      2,
      0,
    )
  }
  if (analysis.totalProfit !== undefined) {
    add(
      {
        id: 'cmp-kpi-profit',
        kind: 'kpi',
        title: 'Lucro total',
        config: { currency: true, aggregation: 'sum' },
        data: [{ label: 'Lucro total', value: analysis.totalProfit }],
      },
      3,
      2,
      3,
    )
  }
  if (analysis.avgTicket !== undefined) {
    add(
      {
        id: 'cmp-kpi-ticket',
        kind: 'kpi',
        title: 'Ticket médio',
        config: { currency: true, aggregation: 'avg' },
        data: [{ label: 'Ticket médio', value: analysis.avgTicket }],
      },
      3,
      2,
      6,
    )
  }
  if (analysis.orderCount !== undefined) {
    add(
      {
        id: 'cmp-kpi-orders',
        kind: 'kpi',
        title: 'Pedidos',
        config: { currency: false, aggregation: 'count' },
        data: [{ label: 'Pedidos', value: analysis.orderCount }],
      },
      3,
      2,
      9,
    )
  }
  if (analysis.monthlyRevenue && analysis.monthlyRevenue.length > 0) {
    add(
      {
        id: 'cmp-line-monthly',
        kind: 'line',
        title: 'Receita por mês',
        config: { currency: true },
        data: analysis.monthlyRevenue,
      },
      6,
      3,
      0,
    )
  }
  if (analysis.categoryRevenue && analysis.categoryRevenue.length > 0) {
    add(
      {
        id: 'cmp-pie-category',
        kind: 'pie',
        title: 'Vendas por categoria',
        config: { currency: true },
        data: analysis.categoryRevenue,
      },
      6,
      3,
      6,
    )
  }
  if (analysis.topProducts && analysis.topProducts.length > 0) {
    add(
      {
        id: 'cmp-ranking-products',
        kind: 'ranking',
        title: 'Ranking de produtos',
        config: { currency: true },
        data: analysis.topProducts,
      },
      6,
      3,
      0,
    )
  }
  if (analysis.topClients && analysis.topClients.length > 0) {
    add(
      {
        id: 'cmp-table-clients',
        kind: 'table',
        title: 'Clientes com maior valor',
        config: { currency: true },
        data: analysis.topClients,
      },
      6,
      3,
      6,
    )
  }
  if (analysis.regionRevenue && analysis.regionRevenue.length > 0) {
    add(
      {
        id: 'cmp-bar-region',
        kind: 'bar',
        title: 'Receita por região',
        config: { currency: true },
        data: analysis.regionRevenue,
      },
      6,
      3,
      0,
    )
  }

  return { components, layout }
}
