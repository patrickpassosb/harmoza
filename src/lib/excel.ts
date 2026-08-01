// HARMOZA — leitura de arquivos .xlsx com SheetJS (100% no navegador)
// Interface compatível com AppShell/UploadArea: parseWorkbook → { fileName, sheets }
import * as XLSX from 'xlsx'
import type { CellValue, Sheet } from './types'

export interface ParsedWorkbook {
  id?: string
  fileName: string
  sheets: Sheet[]
}

// Detecta o tipo de uma coluna a partir dos valores (amostra de até 60 células)
function detectColumnType(values: unknown[]): string {
  let text = 0
  let number = 0
  let currency = 0
  let percent = 0
  let date = 0
  const sample = values.slice(0, 60)
  if (sample.length === 0) return 'text'

  for (const v of sample) {
    if (v === null || v === undefined || v === '') continue
    if (v instanceof Date) {
      date++
      continue
    }
    if (typeof v === 'number') {
      number++
      continue
    }
    const s = String(v).trim()
    if (/^\s*(R\$|USD|\$)\s?[\d.,]+\s*$/i.test(s)) {
      currency++
      continue
    }
    if (/^[-+]?[\d.,]+%$/.test(s)) {
      percent++
      continue
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s)) {
      date++
      continue
    }
    text++
  }

  const total = Math.max(1, text + number + currency + percent + date)
  if (currency / total >= 0.6) return 'currency'
  if (percent / total >= 0.6) return 'percent'
  if (date / total >= 0.6) return 'date'
  if (number / total >= 0.6) return 'number'
  return 'text'
}

function parseCell(v: unknown): CellValue {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v).trim()
  if (s === '') return null
  return s
}

function sheetToSheet(sheetName: string, ws: XLSX.WorkSheet): Sheet {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true })
  const nonEmpty = matrix.filter((row) =>
    row.some((c) => c !== null && c !== undefined && String(c).trim() !== ''),
  )
  if (nonEmpty.length === 0)
    return { id: `s-${Date.now()}`, name: sheetName, columns: [], rows: [], columnTypes: {} }

  const headerRow = nonEmpty[0].map((h) => String(h ?? '').trim())
  const hasHeader = headerRow.some((h) => h !== '')
  const headers = hasHeader
    ? headerRow
    : headerRow.map((_, i) => `Coluna ${String.fromCharCode(65 + i)}`)
  const dataRows = hasHeader ? nonEmpty.slice(1) : nonEmpty

  const nCols = headers.length
  const columnTypes: Record<string, string> = {}
  for (let c = 0; c < nCols; c++) {
    const values = dataRows.map((r) => (c < r.length ? r[c] : null))
    columnTypes[headers[c]] = detectColumnType(values)
  }
  const rows: CellValue[][] = dataRows.map((r) => {
    const out: CellValue[] = []
    for (let c = 0; c < nCols; c++) out.push(c < r.length ? parseCell(r[c]) : null)
    return out
  })
  return {
    id: `s-${Date.now()}-${sheetName}`,
    name: sheetName,
    columns: headers,
    rows,
    columnTypes,
  }
}

// Lê um File .xlsx e produz um workbook (abas + linhas)
export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheets: Sheet[] = wb.SheetNames.map((name) => sheetToSheet(name, wb.Sheets[name])).filter(
    (s) => s.columns.length > 0 && s.rows.length > 0,
  )
  if (sheets.length === 0) {
    throw new Error(
      'Nenhuma aba com dados foi encontrada no arquivo. Verifique se a planilha contém linhas e colunas preenchidas.',
    )
  }
  return { id: `wb-${Date.now()}`, fileName: file.name, sheets }
}
