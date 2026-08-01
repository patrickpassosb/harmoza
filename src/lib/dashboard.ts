import type { ColumnMeta, DashComponent, SheetData } from './types'

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

export interface GeneratedDashboard {
  components: DashComponent[]
  layout: {
    i: string
    x: number
    y: number
    w: number
    h: number
  }[]
}

export function generateDashboard(sheet: SheetData): GeneratedDashboard {
  const components: DashComponent[] = []
  const layout: GeneratedDashboard['layout'] = []

  if (!sheet || !sheet.columns || sheet.columns.length === 0) {
    return { components, layout }
  }

  const cols = sheet.columns || []
  const rows = sheet.rows || []

  const getColName = (c: ColumnMeta | string | undefined): string => {
    if (!c) return ''
    if (typeof c === 'string') return c
    return safeStr(c.name)
  }

  const findColIndex = (re: RegExp): number => {
    return cols.findIndex((c) => re.test(getColName(c).toLowerCase()))
  }

  const revIdx = findColIndex(/receita|venda|faturamento|revenue|total|valor/i)
  const profIdx = findColIndex(/lucro|profit/i)
  const qtyIdx = findColIndex(/qtd|quant|qtde|quantidade|unidades/i)
  const dateIdx = findColIndex(/data|date|periodo|período/i)
  const catIdx = findColIndex(/categoria|category/i)
  const prodIdx = findColIndex(/produto|product|item/i)
  const clientIdx = findColIndex(/cliente|customer|client/i)
  const statusIdx = findColIndex(/status|situação|situacao/i)

  let nextY = 0

  const sumCol = (idx: number): number => {
    if (idx < 0) return 0
    return rows.reduce((acc, r) => {
      const val = Array.isArray(r) ? r[idx] : null
      if (typeof val === 'number') return acc + (isNaN(val) ? 0 : val)
      if (typeof val === 'string') {
        const parsed = parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.'))
        return acc + (Number.isFinite(parsed) ? parsed : 0)
      }
      return acc
    }, 0)
  }

  const revSum = sumCol(revIdx)
  const profSum = sumCol(profIdx)

  // KPI 1: Receita
  if (revIdx >= 0) {
    const id = 'kpi-rev'
    components.push({
      id,
      kind: 'kpi',
      title: 'Receita Total',
      data: [{ label: 'Receita Total', value: Math.round(revSum * 100) / 100 }],
      config: { currency: true, value: revSum },
    })
    layout.push({ i: id, x: 0, y: nextY, w: 3, h: 2 })
  }

  // KPI 2: Lucro
  if (profIdx >= 0) {
    const id = 'kpi-prof'
    components.push({
      id,
      kind: 'kpi',
      title: 'Lucro Total',
      data: [{ label: 'Lucro Total', value: Math.round(profSum * 100) / 100 }],
      config: { currency: true, value: profSum },
    })
    layout.push({ i: id, x: 3, y: nextY, w: 3, h: 2 })
  }

  // KPI 3: Ticket Médio
  if (revIdx >= 0 && rows.length > 0) {
    const id = 'kpi-ticket'
    const avg = revSum / rows.length
    components.push({
      id,
      kind: 'kpi',
      title: 'Ticket Médio',
      data: [{ label: 'Ticket Médio', value: Math.round(avg * 100) / 100 }],
      config: { currency: true, value: avg },
    })
    layout.push({ i: id, x: 6, y: nextY, w: 3, h: 2 })
  }

  // KPI 4: Total de Registros
  {
    const id = 'kpi-count'
    components.push({
      id,
      kind: 'kpi',
      title: 'Total de Registros',
      data: [{ label: 'Total de Registros', value: rows.length }],
      config: { currency: false, value: rows.length },
    })
    layout.push({ i: id, x: 9, y: nextY, w: 3, h: 2 })
    nextY += 2
  }

  // Chart: Receita por Mês
  if (dateIdx >= 0 && revIdx >= 0) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const dateVal = safeStr(Array.isArray(r) ? r[dateIdx] : '')
      const numVal = Array.isArray(r) && typeof r[revIdx] === 'number' ? (r[revIdx] as number) : 0
      let key = dateVal
      const d = new Date(dateVal)
      if (!isNaN(d.getTime())) {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }
      map.set(key, (map.get(key) || 0) + numVal)
    }
    const data = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([l, v]) => ({ label: l, value: Math.round(v * 100) / 100 }))

    if (data.length > 0) {
      const id = 'chart-monthly'
      components.push({
        id,
        kind: 'line',
        title: 'Evolução de Receita',
        data,
        config: { currency: true },
      })
      layout.push({ i: id, x: 0, y: nextY, w: 6, h: 4 })
    }
  }

  // Chart: Categoria
  if (catIdx >= 0 && revIdx >= 0) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const catVal = safeStr(Array.isArray(r) ? r[catIdx] : '') || 'Outros'
      const numVal = Array.isArray(r) && typeof r[revIdx] === 'number' ? (r[revIdx] as number) : 0
      map.set(catVal, (map.get(catVal) || 0) + numVal)
    }
    const data = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([l, v]) => ({ label: l, value: Math.round(v * 100) / 100 }))

    if (data.length > 0) {
      const id = 'chart-cat'
      components.push({
        id,
        kind: 'pie',
        title: 'Vendas por Categoria',
        data,
        config: { currency: true },
      })
      layout.push({ i: id, x: 6, y: nextY, w: 6, h: 4 })
      nextY += 4
    }
  }

  // Ranking: Produtos
  if (prodIdx >= 0) {
    const metricIdx = revIdx >= 0 ? revIdx : qtyIdx
    const map = new Map<string, number>()
    for (const r of rows) {
      const prodVal = safeStr(Array.isArray(r) ? r[prodIdx] : '') || 'Sem nome'
      const numVal =
        metricIdx >= 0 && Array.isArray(r) && typeof r[metricIdx] === 'number'
          ? (r[metricIdx] as number)
          : 1
      map.set(prodVal, (map.get(prodVal) || 0) + numVal)
    }
    const data = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([l, v]) => ({ label: l, value: Math.round(v * 100) / 100 }))

    if (data.length > 0) {
      const id = 'chart-products'
      components.push({
        id,
        kind: 'ranking',
        title: 'Top Produtos',
        data,
        config: { currency: revIdx >= 0 },
      })
      layout.push({ i: id, x: 0, y: nextY, w: 6, h: 4 })
    }
  }

  // Table: Clientes
  if (clientIdx >= 0 && revIdx >= 0) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const clientVal = safeStr(Array.isArray(r) ? r[clientIdx] : '') || 'Sem cliente'
      const numVal = Array.isArray(r) && typeof r[revIdx] === 'number' ? (r[revIdx] as number) : 0
      map.set(clientVal, (map.get(clientVal) || 0) + numVal)
    }
    const data = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([l, v]) => ({ label: l, value: Math.round(v * 100) / 100 }))

    if (data.length > 0) {
      const id = 'chart-clients'
      components.push({
        id,
        kind: 'table',
        title: 'Principais Clientes',
        data,
        config: { currency: true },
      })
      layout.push({ i: id, x: 6, y: nextY, w: 6, h: 4 })
      nextY += 4
    }
  }

  // Bar: Status (Status das Operações — ocupando toda a largura)
  if (statusIdx >= 0) {
    const map = new Map<string, number>()
    for (const r of rows) {
      const stVal = safeStr(Array.isArray(r) ? r[statusIdx] : '') || 'Sem status'
      map.set(stVal, (map.get(stVal) || 0) + 1)
    }
    const data = Array.from(map.entries()).map(([l, v]) => ({ label: l, value: v }))
    if (data.length > 0) {
      const id = 'chart-status'
      components.push({
        id,
        kind: 'bar',
        title: 'Status das Operações',
        data,
        config: { currency: false },
      })
      layout.push({ i: id, x: 0, y: nextY, w: 12, h: 4 })
      nextY += 4
    }
  }

  return { components, layout }
}
