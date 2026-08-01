/* HARMOZA — Leitor de Excel (SheetJS)
   Extrai abas, cabeçalhos, tipos de coluna e valores de um arquivo .xlsx.
   Tudo no navegador — o arquivo do cliente não é enviado a servidor. */

import * as XLSX from 'xlsx'
import type { Column, ColumnType, Sheet, Workbook } from '@/lib/harmoza'
import { inferColumnType } from '@/lib/harmoza'

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
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            ws,
            {
              defval: '',
              raw: true,
            },
          )
          if (rows.length === 0) continue
          const headers = Object.keys(rows[0])
          const columns: Column[] = headers.map((h, i) => {
            const values = rows.map((r) => r[h])
            const type: ColumnType = inferColumnType(h, values)
            return { name: h, type }
          })
          // normalize values (dates to ISO, keep numbers)
          const normalized = rows.map((r) => {
            const out: Record<string, unknown> = {}
            for (const h of headers) {
              out[h] = cellValue(r[h])
            }
            return out
          })
          sheets.push({ name: sheetName, columns, rows: normalized })
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
            'Não foi possível ler o arquivo. Verifique se é um .xlsx válido. (' + String(err) + ')',
          ),
        )
      }
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
    reader.readAsArrayBuffer(file)
  })
}
