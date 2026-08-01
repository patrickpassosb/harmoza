export function fmtCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: v >= 10000 ? 0 : 2,
  })
}
export function fmtNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}
export function fmtCell(v: unknown, type?: string): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return type === 'currency' ? fmtCurrency(v) : fmtNumber(v)
  if (v instanceof Date) return v.toLocaleDateString('pt-BR')
  return String(v)
}
