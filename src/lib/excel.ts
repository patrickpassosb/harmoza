import { parseFiles } from './fileParser'
import type { SheetData, Workbook } from './types'

export interface ParseResult {
  workbook: Workbook
  warnings: string[]
}

export type ParsedWorkbook = {
  fileName: string
  sheets: SheetData[]
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const res = await parseFiles([file])
  if (!res.workbook) {
    throw new Error(res.errors[0] || 'Não foi possível processar o arquivo.')
  }
  return { workbook: res.workbook, warnings: res.warnings }
}

export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const res = await parseExcelFile(file)
  return { fileName: res.workbook.fileName, sheets: res.workbook.sheets }
}

export { parseFiles } from './fileParser'
