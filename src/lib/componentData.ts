import type {
  CellValue,
  ColumnMeta,
  ComponentFilter,
  DashComponent,
  DashKind,
  SheetData,
} from './types'

export function findColumnIndex(columns: ColumnMeta[], name: string): number {
  const lower = name.toLowerCase().trim()
  return columns.findIndex((c) => c.name.toLowerCase().trim() === lower)
}

export function getAvailableFields(columns: ColumnMeta[]): string[] {
  return (columns || []).map((c) => c.name)
}

export function validateFieldExists(columns: ColumnMeta[], fieldName: string): boolean {
  return findColumnIndex(columns, fieldName) >= 0
}

function parseNumeric(v: CellValue): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v
  if (typeof v === 'string') {
    const cleaned = v.replace(/[R$\s.]/g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    return isNaN(n) ? 0 : n
  }
  return 0
}

export function applyFilters(
  rows: CellValue[][],
  columns: ColumnMeta[],
  filters: ComponentFilter[],
): CellValue[][] {
  if (!filters || filters.length === 0) return rows
  return rows.filter((row) => {
    return filters.every((f) => {
      const idx = findColumnIndex(columns, f.field)
      if (idx < 0) return true
      const cellVal = row[idx]
      const cellStr = cellVal === null || cellVal === undefined ? '' : String(cellVal).trim()
      const filterVal = f.value.toLowerCase().trim()
      switch (f.op) {
        case 'eq':
          return cellStr.toLowerCase() === filterVal
        case 'neq':
          return cellStr.toLowerCase() !== filterVal
        case 'contains':
          return cellStr.toLowerCase().includes(filterVal)
        case 'gt':
          return parseNumeric(cellVal) > parseFloat(f.value)
        case 'lt':
          return parseNumeric(cellVal) < parseFloat(f.value)
        case 'gte':
          return parseNumeric(cellVal) >= parseFloat(f.value)
        case 'lte':
          return parseNumeric(cellVal) <= parseFloat(f.value)
        default:
          return true
      }
    })
  })
}

export function aggregateData(
  rows: CellValue[][],
  columns: ColumnMeta[],
  dimensionCol: string,
  metricCol: string | undefined,
  kind: DashKind,
): { label: string; value: number }[] {
  const dimIdx = findColumnIndex(columns, dimensionCol)
  if (dimIdx < 0) return []
  const metIdx = metricCol ? findColumnIndex(columns, metricCol) : -1

  const map = new Map<string, number>()
  for (const row of rows) {
    const rawLabel = row[dimIdx]
    const label = rawLabel === null || rawLabel === undefined ? '—' : String(rawLabel).trim() || '—'
    const value = metIdx >= 0 ? parseNumeric(row[metIdx]) : 1
    map.set(label, (map.get(label) ?? 0) + value)
  }

  const entries = [...map.entries()]
  if (kind === 'ranking' || kind === 'table' || kind === 'pie') {
    entries.sort((a, b) => b[1] - a[1])
  } else {
    entries.sort((a, b) => (a[0] < b[0] ? -1 : 1))
  }

  const limit = kind === 'ranking' || kind === 'table' ? 10 : entries.length
  return entries
    .slice(0, limit)
    .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
}

export function recomputeComponentData(comp: DashComponent, sheet: SheetData): DashComponent {
  const config = (comp.config || {}) as Record<string, unknown>
  const filters = (config.filters as ComponentFilter[]) || undefined
  const sourceSheetId = config.sourceSheetId as string | undefined

  if (sourceSheetId && sheet.id !== sourceSheetId) return comp

  const columns = sheet.columns || []
  let rows = sheet.rows || []

  if (filters && filters.length > 0) {
    rows = applyFilters(rows, columns, filters)
  }

  if (comp.kind === 'kpi') {
    const metricCol = config.metricCol as string | undefined
    const aggregation = (config.aggregation as string) || 'sum'

    if (metricCol) {
      const metIdx = findColumnIndex(columns, metricCol)
      if (metIdx >= 0) {
        let value: number
        if (aggregation === 'count') {
          value = rows.length
        } else if (aggregation === 'avg') {
          const sum = rows.reduce((acc, r) => acc + parseNumeric(r[metIdx]), 0)
          value = rows.length > 0 ? sum / rows.length : 0
        } else {
          value = rows.reduce((acc, r) => acc + parseNumeric(r[metIdx]), 0)
        }
        value = Math.round(value * 100) / 100
        return {
          ...comp,
          data: [{ label: comp.title, value }],
          config: { ...config, value },
        }
      }
    }

    if (aggregation === 'count') {
      const value = rows.length
      return {
        ...comp,
        data: [{ label: comp.title, value }],
        config: { ...config, value },
      }
    }

    return comp
  }

  const dimensionCol = config.dimensionCol as string | undefined
  const metricCol = config.metricCol as string | undefined
  if (!dimensionCol) return comp

  const data = aggregateData(rows, columns, dimensionCol, metricCol, comp.kind)
  return { ...comp, data }
}
