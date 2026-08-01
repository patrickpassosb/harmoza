// HARMOZA — leitura de arquivos .xlsx com SheetJS (100% no navegador)
import * as XLSX from 'xlsx'
import type { CellValue, ColumnMeta, ColumnType, SheetData, Workbook } from './types'

function normalizeHeader(raw: string): string {
  return String(raw).trim()
}

// Detecta o tipo de uma coluna a partir dos valores (amostra de até 60 células)
function detectColumnType(values: unknown[]): ColumnType {
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
    if (
      /^[-+]?\d{1,3}(\.\d{3})*,\d{2}\s*(R\$|USD|\$)?$/i.test(s) ||
      /^\s*(R\$|USD|\$)\s?[\d.,]+\s*$/i.test(s)
    ) {
      currency++
      continue
    }
    if (/^[-+]?[\d.,]+%$/.test(s)) {
      percent++
      continue
    }
    if (
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s) ||
      /^\d{4}-\d{2}-\d{2}$/.test(s) ||
      /^\d{1,2}-\d{1,2}-\d{2,4}$/.test(s)
    ) {
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

export interface ParsedSheet {
  name: string
  columns: ColumnMeta[]
  rows: CellValue[][]
}

// Converte uma planilha do SheetJS em SheetData
function sheetToSheetData(sheetName: string, ws: XLSX.WorkSheet): ParsedSheet {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
  })
  // Remove linhas totalmente vazias
  const nonEmpty = matrix.filter((row) =>
    row.some((c) => c !== null && c !== undefined && String(c).trim() !== ''),
  )
  if (nonEmpty.length === 0) {
    return { name: sheetName, columns: [], rows: [] }
  }

  // Primeira linha = cabeçalho
  const headerRow = nonEmpty[0].map((h) =>
    normalizeHeader(h === null || h === undefined ? '' : String(h)),
  )
  // Se não houver cabeçalho legível, gera Col A, Col B...
  const hasHeader = headerRow.some((h) => h !== '')
  const headers = hasHeader
    ? headerRow
    : headerRow.map((_, i) => `Coluna ${String.fromCharCode(65 + i)}`)
  const dataRows = hasHeader ? nonEmpty.slice(1) : nonEmpty

  // Colunas = headers; detecta tipo por coluna
  const nCols = headers.length
  const columns: ColumnMeta[] = []
  for (let c = 0; c < nCols; c++) {
    const values = dataRows.map((r) => (c < r.length ? r[c] : null))
    columns.push({ name: headers[c] || `Coluna ${c + 1}`, type: detectColumnType(values) })
  }

  const rows: CellValue[][] = dataRows.map((r) => {
    const out: CellValue[] = []
    for (let c = 0; c < nCols; c++) out.push(c < r.length ? parseCell(r[c]) : null)
    return out
  })

  return { name: sheetName, columns, rows }
}

export interface ParseResult {
  workbook: Workbook
  warnings: string[]
}

// Lê um File .xlsx e produz um Workbook
export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheets: SheetData[] = wb.SheetNames.map((name, idx) => {
    const parsed = sheetToSheetData(name, wb.Sheets[name])
    return {
      id: `sheet-${idx}-${Date.now()}`,
      name: parsed.name,
      columns: parsed.columns,
      rows: parsed.rows,
    }
  }).filter((s) => s.columns.length > 0 && s.rows.length > 0)

  if (sheets.length === 0) {
    throw new Error(
      'Nenhuma aba com dados foi encontrada no arquivo. Verifique se a planilha contém linhas e colunas preenchidas.',
    )
  }

  const warnings: string[] = []
  for (const s of sheets) {
    if (s.rows.length > 500) {
      warnings.push(
        `A aba "${s.name}" tem ${s.rows.length} linhas — exibimos e calculamos tudo, mas a navegação pode ficar mais lenta.`,
      )
    }
  }

  const workbook: Workbook = {
    id: `wb-${Date.now()}`,
    fileName: file.name,
    sheets,
    activeSheetId: sheets[0].id,
  }
  return { workbook, warnings }
}

// Converte um Workbook para JSON (para persistir no backend se desejado)
export function workbookToJson(wb: Workbook): string {
  return JSON.stringify(wb)
}
