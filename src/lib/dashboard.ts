// HARMOZA — motor de geração automática de dashboards
// Analisa as colunas da planilha e cria componentes que fazem sentido
// com os dados reais. Nunca inventa valores.
import type { CellValue, ColumnMeta, ColumnType, DashComponent, SheetData } from './types'

export interface NumberColInfo {
  col: ColumnMeta
  index: number
  isCurrency: boolean
}

function isNumLike(v: CellValue): boolean {
  return typeof v === 'number' && Number.isFinite(v)
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtNumber(v: number): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

// Encontra a coluna de data mais provável
function findDateCol(columns: ColumnMeta[]): number {
  const idx = columns.findIndex((c) => c.type === 'date' || /data|dia|mês|mes/i.test(c.name))
  return idx
}

// Encontra a(s) coluna(s) numérica(s) principal(ais)
function findNumberCols(columns: ColumnMeta[]): NumberColInfo[] {
  const out: NumberColInfo[] = []
  columns.forEach((col, i) => {
    if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') {
      out.push({ col, index: i, isCurrency: col.type === 'currency' })
    }
  })
  return out
}

function sumCol(rows: CellValue[][], idx: number): number {
  let s = 0
  for (const r of rows) {
    const v = r[idx]
    if (isNumLike(v)) s += v as number
  }
  return s
}

function sumByGroup(rows: CellValue[][], groupIdx: number, valueIdx: number): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    const g = String(r[groupIdx] ?? '').trim()
    if (!g) continue
    const v = r[valueIdx]
    if (!isNumLike(v)) continue
    m.set(g, (m.get(g) ?? 0) + (v as number))
  }
  return m
}

function countByGroup(rows: CellValue[][], groupIdx: number): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    const g = String(r[groupIdx] ?? '').trim()
    if (!g) continue
    m.set(g, (m.get(g) ?? 0) + 1)
  }
  return m
}

function sortMapDesc(m: Map<string, number>): [string, number][] {
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
}

function monthKey(v: CellValue): string | null {
  if (!v) return null
  const s = String(v)
  const m = s.match(/^(\d{4})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}`
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m2) {
    const y = m2[3].length === 2 ? `20${m2[3]}` : m2[3]
    return `${y}-${String(m2[2]).padStart(2, '0')}`
  }
  return null
}

const TITLES: Record<string, string> = {
  receita: 'Receita',
  faturamento: 'Receita',
  revenue: 'Receita',
  vendas: 'Vendas',
  lucro: 'Lucro',
  custo: 'Custo',
  despesa: 'Despesa',
  quantidade: 'Quantidade',
  qtd: 'Quantidade',
  preço: 'Preço',
  preco: 'Preço',
}

function niceLabel(name: string): string {
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(TITLES)) {
    if (lower.includes(k)) return v
  }
  return name
}

export interface GeneratedDashboard {
  components: DashComponent[]
  layout: { i: string; x: number; y: number; w: number; h: number }[]
}

export function generateDashboard(sheet: SheetData): GeneratedDashboard {
  const { columns, rows } = sheet
  const components: DashComponent[] = []
  const layout: { i: string; x: number; y: number; w: number; h: number }[] = []
  let yPos = 0
  let xPos = 0
  const colW = 3 // cada card de KPI ocupa 3 colunas (12/3 = 4 por linha)

  const dateIdx = findDateCol(columns)
  const numCols = findNumberCols(columns)
  const textCols = columns
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.type === 'text')
    .map(({ c, i }) => ({ col: c, index: i }))

  const push = (comp: Omit<DashComponent, 'id'>, w = 6, h = 4) => {
    const id = `dash-${components.length}-${Date.now().toString(36)}`
    components.push({ ...comp, id } as DashComponent)
    layout.push({ i: id, x: xPos % 12, y: yPos, w, h })
    xPos += w
    if (xPos >= 12) {
      xPos = 0
      yPos += h
    }
  }

  // ---------- KPIs ----------
  const kpis: { title: string; value: string; sub: string }[] = []
  const revenueCol = numCols.find((n) => /receita|faturamento|revenue|vendas/i.test(n.col.name))
  const profitCol = numCols.find((n) => /lucro|profit/i.test(n.col.name))
  const qtyCol = numCols.find((n) => /quantidade|qtd/i.test(n.col.name))
  const costCol = numCols.find((n) => /custo|despesa/i.test(n.col.name))
  const priceCol = numCols.find((n) => /preço|preco/i.test(n.col.name))

  if (revenueCol) {
    const total = sumCol(rows, revenueCol.index)
    kpis.push({
      title: 'Receita Total',
      value: fmtCurrency(total),
      sub: `${rows.length} registros`,
    })
  }
  if (profitCol) {
    const total = sumCol(rows, profitCol.index)
    kpis.push({ title: 'Lucro Total', value: fmtCurrency(total), sub: 'soma da coluna de lucro' })
  }
  // Ticket médio = receita / nº de pedidos (linhas)
  if (revenueCol) {
    const total = sumCol(rows, revenueCol.index)
    const n = rows.length
    if (n > 0)
      kpis.push({ title: 'Ticket Médio', value: fmtCurrency(total / n), sub: `${n} pedidos` })
  }
  if (qtyCol) {
    const total = sumCol(rows, qtyCol.index)
    kpis.push({ title: 'Quantidade Vendida', value: fmtNumber(total), sub: 'unidades' })
  }
  if (kpis.length === 0 && numCols.length > 0) {
    const nc = numCols[0]
    const total = sumCol(rows, nc.index)
    kpis.push({
      title: `Total de ${niceLabel(nc.col.name)}`,
      value: nc.isCurrency ? fmtCurrency(total) : fmtNumber(total),
      sub: 'soma dos registros',
    })
  }
  // Sempre mostra nº de registros como KPI básico
  kpis.push({ title: 'Registros', value: String(rows.length), sub: 'linhas importadas' })

  kpis.forEach((k) => {
    push(
      {
        kind: 'kpi',
        title: k.title,
        subtitle: k.sub,
        data: [{ label: k.title, value: 0 }],
        config: { value: k.value },
      },
      colW,
      3,
    )
  })

  // ---------- Evolução mensal (data + receita) ----------
  if (dateIdx >= 0 && revenueCol) {
    const byMonth = sumByGroup(rows, dateIdx, revenueCol.index)
    const months = Array.from(byMonth.keys()).sort()
    const data = months.map((m) => ({
      label: m,
      value: Math.round(byMonth.get(m) ?? 0 * 100) / 100,
    }))
    if (data.length > 0) {
      push(
        {
          kind: 'line',
          title: 'Receita por Mês',
          subtitle: 'evolução mensal da receita',
          data,
          config: { currency: true },
        },
        7,
        4,
      )
    }
  } else if (dateIdx >= 0 && numCols.length > 0) {
    const nc = numCols[0]
    const byMonth = sumByGroup(rows, dateIdx, nc.index)
    const months = Array.from(byMonth.keys()).sort()
    const data = months.map((m) => ({
      label: m,
      value: Math.round(byMonth.get(m) ?? 0 * 100) / 100,
    }))
    if (data.length > 0) {
      push(
        {
          kind: 'line',
          title: `${niceLabel(nc.col.name)} por Mês`,
          subtitle: 'evolução mensal',
          data,
          config: { currency: nc.isCurrency },
        },
        7,
        4,
      )
    }
  }

  // ---------- Distribuição por categoria / produto ----------
  const catIdx = textCols.find(({ col }) => /categoria|departamento/i.test(col.name))?.index ?? -1
  const prodIdx = textCols.find(({ col }) => /produto|item|sku/i.test(col.name))?.index ?? -1
  const regIdx = textCols.find(({ col }) => /regi|uf|estado/i.test(col.name))?.index ?? -1
  const statusIdx = textCols.find(({ col }) => /status|situa/i.test(col.name))?.index ?? -1
  const valueIdx = revenueCol?.index ?? numCols[0]?.index ?? -1

  if (catIdx >= 0 && valueIdx >= 0) {
    const byCat = sumByGroup(rows, catIdx, valueIdx)
    const data = sortMapDesc(byCat)
      .slice(0, 8)
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
    if (data.length > 0) {
      push(
        {
          kind: 'bar',
          title: 'Vendas por Categoria',
          subtitle: 'distribuição da receita',
          data,
          config: { currency: revenueCol?.isCurrency ?? false },
        },
        5,
        4,
      )
    }
  }

  if (prodIdx >= 0 && valueIdx >= 0) {
    const byProd = sumByGroup(rows, prodIdx, valueIdx)
    const data = sortMapDesc(byProd)
      .slice(0, 6)
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
    if (data.length > 0) {
      push(
        {
          kind: 'bar',
          title: 'Produtos com Maior Receita',
          subtitle: 'top produtos',
          data,
          config: { currency: revenueCol?.isCurrency ?? false },
        },
        5,
        4,
      )
    }
  }

  if (regIdx >= 0 && valueIdx >= 0) {
    const byReg = sumByGroup(rows, regIdx, valueIdx)
    const data = sortMapDesc(byReg).map(([label, value]) => ({
      label,
      value: Math.round(value * 100) / 100,
    }))
    if (data.length > 0) {
      push(
        {
          kind: 'pie',
          title: 'Receita por Região',
          subtitle: 'distribuição regional',
          data,
          config: { currency: revenueCol?.isCurrency ?? false },
        },
        4,
        4,
      )
    }
  }

  if (statusIdx >= 0) {
    const byStatus = countByGroup(rows, statusIdx)
    const data = sortMapDesc(byStatus).map(([label, value]) => ({ label, value }))
    if (data.length > 0) {
      push(
        {
          kind: 'pie',
          title: 'Pedidos por Status',
          subtitle: 'distribuição do status',
          data,
          config: {},
        },
        4,
        4,
      )
    }
  }

  // ---------- Ranking de vendedores / clientes ----------
  const sellerIdx =
    textCols.find(({ col }) => /vendedor|vendas.*(nome|resp)|representante/i.test(col.name))
      ?.index ?? -1
  const clientIdx =
    textCols.find(({ col }) => /cliente|empresa|loja|mercado|padaria|restaurante/i.test(col.name))
      ?.index ?? -1

  if (sellerIdx >= 0 && valueIdx >= 0) {
    const bySeller = sumByGroup(rows, sellerIdx, valueIdx)
    const data = sortMapDesc(bySeller)
      .slice(0, 8)
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
    if (data.length > 0) {
      push(
        {
          kind: 'ranking',
          title: 'Ranking de Vendedores',
          subtitle: 'por receita gerada',
          data,
          config: { currency: revenueCol?.isCurrency ?? false },
        },
        4,
        4,
      )
    }
  }

  if (clientIdx >= 0 && valueIdx >= 0) {
    const byClient = sumByGroup(rows, clientIdx, valueIdx)
    const data = sortMapDesc(byClient)
      .slice(0, 8)
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
    if (data.length > 0) {
      push(
        {
          kind: 'table',
          title: 'Clientes com Maior Valor',
          subtitle: 'top clientes por receita',
          data,
          config: { currency: revenueCol?.isCurrency ?? false },
        },
        6,
        4,
      )
    }
  }

  // ---------- Tabela resumida (se não houver tabela de clientes) ----------
  if (!clientIdx && textCols.length > 0) {
    const groupIdx = textCols[0].index
    const byGroup = sumByGroup(rows, groupIdx, valueIdx)
    const data = sortMapDesc(byGroup)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
    if (data.length > 0) {
      push(
        {
          kind: 'table',
          title: `Resumo por ${niceLabel(columns[groupIdx].name)}`,
          subtitle: 'agrupado pelos dados reais',
          data,
          config: { currency: revenueCol?.isCurrency ?? false },
        },
        6,
        4,
      )
    }
  }

  // Se não houver nada além de KPIs, adiciona tabela geral
  if (components.length <= 1) {
    push(
      {
        kind: 'table',
        title: 'Dados Importados',
        subtitle: 'primeiras linhas da planilha',
        data: rows.slice(0, 10).map((r, i) => ({ label: `#${i + 1}`, value: i })),
        config: {},
      },
      12,
      5,
    )
  }

  return { components, layout }
}
