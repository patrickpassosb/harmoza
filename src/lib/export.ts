import * as XLSX from 'xlsx'
import type { SheetData, Workbook } from './types'

function sheetToAoA(sheet: SheetData): (string | number)[][] {
  const header = sheet.columns.map((c) => c.name)
  const rows = sheet.rows.map((r) => r.map((cell) => (cell === null ? '' : cell)))
  return [header, ...rows]
}

export function exportXlsx(workbook: Workbook): void {
  const wb = XLSX.utils.book_new()
  for (const sheet of workbook.sheets) {
    const aoa = sheetToAoA(sheet)
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const sheetName = (sheet.name || 'Sheet').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }
  const baseName = workbook.fileName.replace(/\.[^.]+$/, '') || 'harmoza-export'
  XLSX.writeFile(wb, `${baseName}.xlsx`)
}

export function exportCsv(sheet: SheetData): void {
  const aoa = sheetToAoA(sheet)
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sheet.name || 'export'}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
