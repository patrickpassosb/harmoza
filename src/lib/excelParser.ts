/* HARMOZA — Leitor de Excel (SheetJS)
   Extrai abas, cabeçalhos, tipos de coluna e valores de um arquivo .xlsx.
   Tudo no navegador — o arquivo do cliente não é enviado a servidor. */

import * as XLSX from 'xlsx'
import type { Column, ColumnType, Sheet, Workbook } from '@/lib/harmoza'
import { inferColumnType, safeString } from '@/lib/harmoza'

export interface ParseResult {
  workbook: Workbook
}

function cellValue(v: unknown): unknown {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return v
}

export function parseWorkbookFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const sheets: Sheet[] = []

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          reject(new Error('O arquivo não contém abas de dados.'))
          return
        }

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          if (!ws) continue

          const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json<
            Record<string, unknown>
          >(ws, {
            defval: '',
            raw: true,
          })
          if (rawRows.length === 0) continue

          const rawHeaders = Object.keys(rawRows[0])
          const usedHeaders = new Set<string>()

          const columns: Column[] = rawHeaders.map((h, i) => {
            let headerName = safeString(h)
            if (!headerName) headerName = `Coluna ${i + 1}`

            let uniqueName = headerName
            let counter = 2
            while (usedHeaders.has(uniqueName.toLowerCase())) {
              uniqueName = `${headerName}_${counter}`
              counter++
            }
            usedHeaders.add(uniqueName.toLowerCase())

            const values = rawRows.map((r) => r[h])
            const type: ColumnType = inferColumnType(uniqueName, values)
            return { name: uniqueName, type }
          })

          const normalized = rawRows.map((r) => {
            const out: Record<string, unknown> = {}
            rawHeaders.forEach((h, idx) => {
              const colName = columns[idx].name
              out[colName] = cellValue(r[h])
            })
            return out
          })

          sheets.push({
            name: safeString(sheetName) || `Aba ${sheets.length + 1}`,
            columns,
            rows: normalized,
          })
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
          name: file.name.replace(/\.xlsx?$/i, '') || 'Planilha importada',
          fileName: file.name,
          sheets,
        }
        resolve({ workbook })
      } catch (err) {
        reject(
          new Error(
            'Não foi possível ler o arquivo. Verifique se é um .xlsx válido. (' +
              (err instanceof Error ? err.message : String(err)) +
              ')',
          ),
        )
      }
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
    reader.readAsArrayBuffer(file)
  })
}
