import * as XLSX from 'xlsx'
import type { CellValue, ColumnMeta, SheetData, Workbook } from './types'
import { inferColumnType, parseNumber } from './harmoza'

export interface ParseResult {
  workbook: Workbook
  warnings: string[]
}

export type ParsedWorkbook = {
  fileName: string
  sheets: SheetData[]
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const warnings: string[] = []
        const sheets: SheetData[] = []

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          reject(new Error('O arquivo não contém abas com dados.'))
          return
        }

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          if (!ws) continue

          const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: '',
            raw: false,
            dateNF: 'yyyy-mm-dd',
          }) as unknown[][]

          if (!rawRows || rawRows.length === 0) continue

          // Encontra a primeira linha com conteúdo para ser o cabeçalho
          let headerRowIndex = -1
          for (let i = 0; i < rawRows.length; i++) {
            if (
              rawRows[i] &&
              Array.isArray(rawRows[i]) &&
              rawRows[i].some(
                (cell) => cell !== null && cell !== undefined && String(cell).trim() !== '',
              )
            ) {
              headerRowIndex = i
              break
            }
          }

          if (headerRowIndex === -1) continue

          const headerCells = rawRows[headerRowIndex] as unknown[]
          const dataRows = rawRows.slice(headerRowIndex + 1)

          const usedHeaderNames = new Set<string>()
          const columns: ColumnMeta[] = headerCells.map((h, i) => {
            let rawName = h !== null && h !== undefined ? String(h).trim() : ''
            if (!rawName) rawName = `Coluna ${i + 1}`

            let uniqueName = rawName
            let counter = 2
            while (usedHeaderNames.has(uniqueName.toLowerCase())) {
              uniqueName = `${rawName}_${counter}`
              counter++
            }
            usedHeaderNames.add(uniqueName.toLowerCase())

            const sampleValues = dataRows.map((r) => (Array.isArray(r) ? r[i] : null))
            const type = inferColumnType(uniqueName, sampleValues)

            return { name: uniqueName, type }
          })

          const normalizedRows: CellValue[][] = dataRows
            .filter(
              (r) =>
                Array.isArray(r) &&
                r.some((v) => v !== null && v !== undefined && String(v).trim() !== ''),
            )
            .map((r) => {
              return columns.map((col, i) => {
                const val = Array.isArray(r) ? r[i] : null
                if (val === null || val === undefined || val === '') return null
                if (typeof val === 'number') return isNaN(val) ? null : val
                if (typeof val === 'boolean') return val ? 'Sim' : 'Não'
                if (val instanceof Date) return val.toISOString().slice(0, 10)
                const sVal = String(val).trim()
                if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') {
                  const num = parseNumber(sVal)
                  return num !== null ? num : sVal
                }
                return sVal
              })
            })

          if (columns.length > 0) {
            sheets.push({
              id: 'sheet-' + Math.random().toString(36).slice(2, 9),
              name: String(sheetName).trim() || `Aba ${sheets.length + 1}`,
              columns,
              rows: normalizedRows,
            })
          }
        }

        if (sheets.length === 0) {
          reject(
            new Error(
              'O arquivo não contém abas com dados em formato de tabela (cabeçalho + linhas).',
            ),
          )
          return
        }

        const workbook: Workbook = {
          id: 'wb-' + Date.now(),
          fileName: file.name,
          sheets,
          activeSheetId: sheets[0].id,
        }

        resolve({ workbook, warnings })
      } catch (err) {
        reject(
          new Error(
            'Não foi possível ler o arquivo Excel. Verifique o formato. (' +
              (err instanceof Error ? err.message : String(err)) +
              ')',
          ),
        )
      }
    }
    reader.onerror = () => reject(new Error('Falha na leitura do arquivo local.'))
    reader.readAsArrayBuffer(file)
  })
}

export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const res = await parseExcelFile(file)
  return {
    fileName: res.workbook.fileName,
    sheets: res.workbook.sheets,
  }
}
