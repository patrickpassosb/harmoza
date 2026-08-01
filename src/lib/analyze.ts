// HARMOZA — análise de dados e geração automática de dashboard
// Regras: só gera componentes que fazem sentido com as colunas existentes.
// Nunca inventa valores — tudo é calculado a partir dos dados reais.

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

// Utilidades (inline para evitar bugs)
function num(v: CellValue): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[R$\s.]/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}
function isNum(v: CellValue): boolean {
  return (
    typeof v === 'number' ||
    (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(parseFloat(v)))
  )
}
function str(v: CellValue): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

export function analyzeSheet(sheet: Sheet): Analysis {
  const cols = sheet.columns
  const rows = sheet.rows
  const has = (name: string) => cols.some((c) => c.toLowerCase().includes(name))

  // Detecta colunas relevantes por nome
  const findCol = (names: string[]) =>
    cols.find((c) => names.some((n) => c.toLowerCase().includes(n)))

  const revenueCol = findCol(['receita', 'receita total', 'vendas', 'faturamento', 'valor total'])
  const profitCol = findCol(['lucro', 'margem', 'resultado'])
  const dateCol = findCol(['data', 'dia', 'mês', 'mes', 'competência'])
  const categoryCol = findCol(['categoria', 'departamento', 'segmento', 'grupo'])
  const productCol = findCol(['produto', 'item', 'sku', 'nome', 'descrição', 'descricao'])
  const clientCol = findCol(['cliente', 'client', 'razão social', 'razao social'])
  const regionCol = findCol(['região', 'regiao', 'estado', 'uf', 'cidade'])
  const statusCol = findCol(['status', 'situação', 'situacao', 'estado do pedido'])
  const qtyCol = findCol(['quantidade', 'qtd', 'qtde', 'unidades'])

  const revenue = revenueCol
    ? rows.reduce((s, r) => s + num(r[cols.indexOf(revenueCol)]), 0)
    : undefined
  const profit = profitCol
    ? rows.reduce((s, r) => s + num(r[cols.indexOf(profitCol)]), 0)
    : undefined
  const orderCount = rows.length

  const analysis: Analysis = {
    totalRevenue: revenue,
    totalProfit: profit,
    orderCount,
    hasRevenue: !!revenueCol,
    hasProfit: !!profitCol,
    hasDate: !!dateCol,
  }

  if (revenue !== undefined && orderCount > 0) analysis.avgTicket = revenue / orderCount

  // Evolução mensal (se houver data)
  if (dateCol) {
    const byMonth = new Map<string, number>()
    for (const r of rows) {
      const raw = str(r[cols.indexOf(dateCol)])
      let key = raw
      const d = new Date(raw)
      if (!Number.isNaN(d.getTime())) {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      } else {
        const m = raw.match(/(\d{4})[-/](\d{1,2})/)
        if (m) key = `${m[1]}-${String(Number(m[2])).padStart(2, '0')}`
      }
      const val = revenueCol ? num(r[cols.indexOf(revenueCol)]) : 1
      byMonth.set(key, (byMonth.get(key) || 0) + val)
    }
    analysis.monthlyRevenue = [...byMonth.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([label, value]) => ({
        label: label.length === 7 ? label.slice(0, 4) + '/' + label.slice(5, 7) : label,
        value,
      }))
  }

  // Por categoria
  if (categoryCol && revenueCol) {
    const byCat = new Map<string, number>()
    for (const r of rows) {
      const k = str(r[cols.indexOf(categoryCol)]) || 'Sem categoria'
      byCat.set(k, (byCat.get(k) || 0) + num(r[cols.indexOf(revenueCol)]))
    }
    analysis.categoryRevenue = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  }

  // Produtos mais vendidos (por receita ou quantidade)
  if (productCol) {
    const byProd = new Map<string, number>()
    const metricCol = revenueCol || qtyCol
    for (const r of rows) {
      const k = str(r[cols.indexOf(productCol)]) || 'Sem produto'
      byProd.set(k, (byProd.get(k) || 0) + (metricCol ? num(r[cols.indexOf(metricCol)]) : 1))
    }
    analysis.topProducts = [...byProd.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }))
  }

  // Clientes com maior valor
  if (clientCol && revenueCol) {
    const byClient = new Map<string, number>()
    for (const r of rows) {
      const k = str(r[cols.indexOf(clientCol)]) || 'Sem cliente'
      byClient.set(k, (byClient.get(k) || 0) + num(r[cols.indexOf(revenueCol)]))
    }
    analysis.topClients = [...byClient.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }))
  }

  // Por região
  if (regionCol && revenueCol) {
    const byRegion = new Map<string, number>()
    for (const r of rows) {
      const k = str(r[cols.indexOf(regionCol)]) || 'Sem região'
      byRegion.set(k, (byRegion.get(k) || 0) + num(r[cols.indexOf(revenueCol)]))
    }
    analysis.regionRevenue = [...byRegion.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  }

  // Contagem por status
  if (statusCol) {
    const byStatus = new Map<string, number>()
    for (const r of rows) {
      const k = str(r[cols.indexOf(statusCol)]) || 'Sem status'
      byStatus.set(k, (byStatus.get(k) || 0) + 1)
    }
    analysis.statusCounts = [...byStatus.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  }

  return analysis
}

// Gera componentes de dashboard a partir da análise (heurística)
export function buildDashboard(
  sheet: Sheet,
  analysis: Analysis,
): { components: DashComponent[]; layout: DashboardLayoutItem[] } {
  const components: DashComponent[] = []
  const layout: DashboardLayoutItem[] = []
  let i = 0
  let y = 0

  const add = (c: DashComponent, w: number, h: number, x = 0) => {
    components.push(c)
    layout.push({ i: c.id, x, y, w, h })
    y += h
    i++
  }

  const currency = (v?: number): DashComponent['format'] =>
    v !== undefined ? 'currency' : 'number'

  // KPIs
  if (analysis.totalRevenue !== undefined) {
    add(
      {
        id: 'cmp-kpi-revenue',
        type: 'kpi',
        title: 'Receita total',
        columnY: 'receita',
        aggregation: 'sum',
        format: 'currency',
        labels: ['Receita total'],
        values: [analysis.totalRevenue],
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
        type: 'kpi',
        title: 'Lucro total',
        columnY: 'lucro',
        aggregation: 'sum',
        format: 'currency',
        labels: ['Lucro total'],
        values: [analysis.totalProfit],
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
        type: 'kpi',
        title: 'Ticket médio',
        columnY: 'receita',
        aggregation: 'avg',
        format: 'currency',
        labels: ['Ticket médio'],
        values: [analysis.avgTicket],
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
        type: 'kpi',
        title: 'Pedidos',
        columnY: 'quantidade',
        aggregation: 'count',
        format: 'number',
        labels: ['Pedidos'],
        values: [analysis.orderCount],
      },
      3,
      2,
      9,
    )
  }

  // Gráfico: receita por mês
  if (analysis.monthlyRevenue && analysis.monthlyRevenue.length > 0) {
    add(
      {
        id: 'cmp-line-monthly',
        type: 'line',
        title: 'Receita por mês',
        columnX: 'data',
        columnY: 'receita',
        aggregation: 'sum',
        format: 'currency',
        labels: analysis.monthlyRevenue.map((m) => m.label),
        values: analysis.monthlyRevenue.map((m) => m.value),
      },
      6,
      3,
      0,
    )
  }

  // Gráfico: vendas por categoria
  if (analysis.categoryRevenue && analysis.categoryRevenue.length > 0) {
    add(
      {
        id: 'cmp-pie-category',
        type: 'pie',
        title: 'Vendas por categoria',
        columnX: 'categoria',
        columnY: 'receita',
        aggregation: 'sum',
        format: 'currency',
        labels: analysis.categoryRevenue.map((c) => c.label),
        values: analysis.categoryRevenue.map((c) => c.value),
      },
      6,
      3,
      6,
    )
  }

  // Ranking de produtos
  if (analysis.topProducts && analysis.topProducts.length > 0) {
    add(
      {
        id: 'cmp-ranking-products',
        type: 'ranking',
        title: 'Ranking de produtos',
        columnX: 'produto',
        columnY: 'receita',
        aggregation: 'sum',
        format: 'currency',
        rows: analysis.topProducts.map((p) => ({ label: p.label, value: p.value })),
      },
      6,
      3,
      0,
    )
  }

  // Tabela de clientes
  if (analysis.topClients && analysis.topClients.length > 0) {
    add(
      {
        id: 'cmp-table-clients',
        type: 'table',
        title: 'Clientes com maior valor',
        columnX: 'cliente',
        columnY: 'receita',
        aggregation: 'sum',
        format: 'currency',
        rows: analysis.topClients.map((c) => ({ label: c.label, value: c.value })),
      },
      6,
      3,
      6,
    )
  }

  // Região (se houver)
  if (analysis.regionRevenue && analysis.regionRevenue.length > 0) {
    add(
      {
        id: 'cmp-bar-region',
        type: 'bar',
        title: 'Receita por região',
        columnX: 'região',
        columnY: 'receita',
        aggregation: 'sum',
        format: 'currency',
        labels: analysis.regionRevenue.map((r) => r.label),
        values: analysis.regionRevenue.map((r) => r.value),
      },
      6,
      3,
      0,
    )
  }

  return { components, layout }
}
