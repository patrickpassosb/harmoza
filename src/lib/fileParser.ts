import * as XLSX from 'xlsx'
import type { CellValue, ColumnMeta, ColumnType, SheetData, Workbook } from './types'
import { inferColumnType, parseNumber } from './harmoza'

export interface ParseResult {
  workbook: Workbook | null
  warnings: string[]
  errors: string[]
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024
export const MAX_ROWS = 10000
export const SUPPORTED_EXTENSIONS = '.csv, .xlsx, .xls, .ods, .tsv, .txt'
const SUPPORTED_EXT_REGEX = /\.(csv|xlsx|xls|ods|tsv|txt)$/i
const DELIMITED_EXT_REGEX = /\.(csv|tsv|txt)$/i

export function isSupportedFile(fileName: string): boolean {
  return SUPPORTED_EXT_REGEX.test(fileName)
}

export function getBaseFileName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '')
}

export function sanitizeSheetName(name: string): string {
  let s = name.replace(/[[\]:*?/\\]/g, '_').trim()
  if (!s) s = 'Planilha'
  if (s.length > 31) s = s.slice(0, 31)
  return s
}

function uniqueSheetName(base: string, used: Set<string>): string {
  let name = base
  let n = 2
  while (used.has(name.toLowerCase())) {
    const suffix = `_${n}`
    name = base.slice(0, 31 - suffix.length) + suffix
    n++
  }
  used.add(name.toLowerCase())
  return name
}

function toColumnType(t: string): ColumnType {
  return (t === 'percentage' ? 'percent' : t) as ColumnType
}

function decodeText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.slice(3))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('iso-8859-1').decode(bytes)
  }
}

function detectDelimiter(text: string): string {
  const lines = text
    .split('\n')
    .slice(0, 20)
    .filter((l) => l.trim())
  if (!lines.length) return ','
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 }
  for (const line of lines) {
    for (const ch of line) {
      if (ch in counts) counts[ch]++
    }
  }
  let best = ','
  let max = 0
  for (const [d, c] of Object.entries(counts)) {
    if (c > max) {
      best = d
      max = c
    }
  }
  return best
}

function processRawRows(
  rawRows: unknown[][],
  sheetName: string,
  fileName: string,
): SheetData | null {
  let headerIndex = -1
  for (let i = 0; i < rawRows.length; i++) {
    if (rawRows[i]?.some((c) => c != null && String(c).trim() !== '')) {
      headerIndex = i
      break
    }
  }
  if (headerIndex === -1) return null

  const headerCells = rawRows[headerIndex] as unknown[]
  const dataRows = rawRows.slice(headerIndex + 1)

  if (dataRows.length > MAX_ROWS) {
    throw new Error(
      `"${fileName}" excede o limite de ${MAX_ROWS.toLocaleString('pt-BR')} linhas por aba (${dataRows.length.toLocaleString('pt-BR')} encontradas).`,
    )
  }

  const used = new Set<string>()
  const columns: ColumnMeta[] = headerCells.map((h, i) => {
    let raw = h != null ? String(h).trim() : ''
    if (!raw) raw = `Coluna ${i + 1}`
    let unique = raw
    let n = 2
    while (used.has(unique.toLowerCase())) {
      unique = `${raw}_${n++}`
    }
    used.add(unique.toLowerCase())
    const samples = dataRows.map((r) => (Array.isArray(r) ? r[i] : null))
    return { name: unique, type: toColumnType(inferColumnType(unique, samples)) }
  })

  const rows: CellValue[][] = dataRows
    .filter((r) => Array.isArray(r) && r.some((v) => v != null && String(v).trim() !== ''))
    .map((r) =>
      columns.map((col, i) => {
        const val = Array.isArray(r) ? r[i] : null
        if (val == null || val === '') return null
        if (typeof val === 'number') return isNaN(val) ? null : val
        if (typeof val === 'boolean') return val ? 'Sim' : 'Não'
        if (val instanceof Date) return val.toISOString().slice(0, 10)
        const s = String(val).trim()
        if (['number', 'currency', 'percent'].includes(col.type)) {
          const num = parseNumber(s)
          return num !== null ? num : s
        }
        return s
      }),
    )

  if (!columns.length) return null
  return {
    id: 'sheet-' + Math.random().toString(36).slice(2, 9),
    name: sheetName,
    columns,
    rows,
  }
}

function extractRows(ws: XLSX.WorkSheet, dateNF?: string): unknown[][] {
  return XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: dateNF || 'yyyy-mm-dd',
  }) as unknown[][]
}

async function parseSingleFile(file: File, usedNames: Set<string>): Promise<SheetData[]> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `"${file.name}" excede o limite de 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    )
  }
  if (!SUPPORTED_EXT_REGEX.test(file.name)) {
    throw new Error(`Formato não suportado: "${file.name}". Use ${SUPPORTED_EXTENSIONS}.`)
  }

  const baseName = getBaseFileName(file.name)
  const fileSheetName = uniqueSheetName(sanitizeSheetName(baseName), usedNames)

  if (DELIMITED_EXT_REGEX.test(file.name)) {
    const buf = await file.arrayBuffer()
    const text = decodeText(buf)
    const ext = file.name.toLowerCase()
    const delimiter = ext.endsWith('.tsv') ? '\t' : detectDelimiter(text)
    const wb = XLSX.read(text, { type: 'string', FS: delimiter, raw: false })
    const ws = wb.Sheets[wb.SheetNames[0]]
    if (!ws) throw new Error(`"${file.name}" não contém dados.`)
    const sheet = processRawRows(extractRows(ws), fileSheetName, file.name)
    if (!sheet) throw new Error(`"${file.name}" não contém dados em formato de tabela.`)
    return [sheet]
  }

  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  if (!wb.SheetNames?.length) throw new Error(`"${file.name}" não contém abas.`)

  const sheets: SheetData[] = []
  let isFirst = true
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn]
    if (!ws) continue
    const name = isFirst ? fileSheetName : uniqueSheetName(sanitizeSheetName(sn), usedNames)
    isFirst = false
    const sheet = processRawRows(extractRows(ws), name, file.name)
    if (sheet) sheets.push(sheet)
  }

  if (!sheets.length) throw new Error(`"${file.name}" não contém dados em formato de tabela.`)
  return sheets
}

export async function parseFiles(files: File[]): Promise<ParseResult> {
  const warnings: string[] = []
  const errors: string[] = []
  const usedNames = new Set<string>()
  const allSheets: SheetData[] = []

  for (const file of files) {
    try {
      const sheets = await parseSingleFile(file, usedNames)
      allSheets.push(...sheets)
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Erro ao processar "${file.name}".`)
    }
  }

  if (!allSheets.length) {
    return { workbook: null, warnings, errors }
  }

  const workbook: Workbook = {
    id: 'wb-' + Date.now(),
    fileName: files.length === 1 ? files[0].name : `${files.length} arquivos`,
    sheets: allSheets,
    activeSheetId: allSheets[0].id,
  }

  return { workbook, warnings, errors }
}
