// HARMOZA — formatação de valores (pt-BR)

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

export function fmtPercent(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
}

export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '—'
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtCell(v: unknown, type?: string): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    if (type === 'currency') return fmtCurrency(v)
    if (type === 'percent') return fmtPercent(v)
    return fmtNumber(v)
  }
  if (v instanceof Date) return fmtDate(v)
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  const s = String(v)
  if (type === 'date' && /^\d{4}-\d{2}-\d{2}/.test(s)) return fmtDate(s)
  return s
}

// Converte uma string ISO (aaaa-mm-dd) para rótulo amigável (mmm/aa)
export function monthLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('.', '')
    .replace(' ', '/')
}
