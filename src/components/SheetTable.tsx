import { useState } from 'react'
import { Columns3, Rows3, Trash2 } from 'lucide-react'
import type { CellValue, SheetData, ColumnMeta } from '@/lib/types'
import { fmtCell } from '@/lib/format'

interface Props {
  sheet: SheetData
  onChange: (sheet: SheetData) => void
}

export function SheetTable({ sheet, onChange }: Props) {
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null)
  const [draft, setDraft] = useState('')

  const columns = sheet.columns ?? []
  const rows = sheet.rows ?? []
  const colType = (i: number) => columns[i]?.type ?? 'text'
  const colName = (i: number) => columns[i]?.name ?? ''
  const headerLabels = columns.map((c) =>
    c && typeof c === 'object' && 'name' in c ? c.name : String(c ?? ''),
  )

  const updateCell = (r: number, c: number, value: CellValue) => {
    const next = rows.map((row, ri) =>
      ri === r ? row.map((v, ci) => (ci === c ? value : v)) : row,
    )
    onChange({ ...sheet, rows: next })
  }

  const addRow = () => onChange({ ...sheet, rows: [...rows, columns.map(() => null)] })

  const addColumn = () => {
    const name = `Coluna ${columns.length + 1}`
    const newCol: ColumnMeta = { name, type: 'text' }
    onChange({
      ...sheet,
      columns: [...columns, newCol],
      rows: rows.map((r) => [...r, null]),
    })
  }

  const removeRow = (r: number) => onChange({ ...sheet, rows: rows.filter((_, ri) => ri !== r) })

  const commitEdit = (r: number, c: number) => {
    const type = colType(c)
    let value: CellValue = draft
    if (draft.trim() === '') value = null
    else if (type === 'number' || type === 'currency' || type === 'percent') {
      const n = parseFloat(draft.replace(/[R$\s.]/g, '').replace(',', '.'))
      value = Number.isFinite(n) ? n : draft
    }
    updateCell(r, c, value)
    setEditing(null)
  }

  const typeLabel = (t: string) => {
    if (t === 'currency') return 'R$'
    if (t === 'date') return 'data'
    if (t === 'percent') return '%'
    return t
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <span className="text-sm font-semibold text-[#172554]">
          {sheet.name}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {rows.length} linhas · {columns.length} colunas
          </span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={addColumn}
            title="Adicionar coluna"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#172554] hover:bg-[#172554]/10"
          >
            <Columns3 className="h-3.5 w-3.5" /> Coluna
          </button>
          <button
            onClick={addRow}
            title="Adicionar linha"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#172554] hover:bg-[#172554]/10"
          >
            <Rows3 className="h-3.5 w-3.5" /> Linha
          </button>
        </div>
      </div>
      <div className="max-h-[52vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-[#172554] text-left text-white">
              <th className="w-10 px-2 py-2 text-center text-xs font-medium text-white/70">#</th>
              {headerLabels.map((label, c) => (
                <th
                  key={c}
                  className="whitespace-nowrap border-l border-white/10 px-3 py-2 text-xs font-semibold"
                >
                  {label || `Coluna ${c + 1}`}
                  <span className="ml-1.5 text-[10px] font-normal uppercase text-white/50">
                    {typeLabel(colType(c))}
                  </span>
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  Esta aba está vazia. Adicione linhas ou colunas.
                </td>
              </tr>
            )}
            {rows.map((row, r) => (
              <tr key={r} className="border-t border-border/70 hover:bg-[#0F766E]/[0.03]">
                <td className="px-2 py-1 text-center text-xs text-muted-foreground">{r + 1}</td>
                {row.map((v, c) => {
                  const isEditing = editing?.r === r && editing?.c === c
                  return (
                    <td key={c} className="min-w-[110px] border-l border-border/60 px-2 py-0.5">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commitEdit(r, c)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(r, c)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          className="w-full rounded border border-[#0F766E] bg-white px-1.5 py-1 text-sm outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditing({ r, c })
                            setDraft(v === null ? '' : String(v))
                          }}
                          className="block w-full truncate rounded px-1 py-1 text-left text-[13px] text-[#1e293b] hover:bg-[#0F766E]/10"
                          title="Clique para editar"
                        >
                          {fmtCell(v, colType(c)) || (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </button>
                      )}
                    </td>
                  )
                })}
                <td className="px-1 text-center">
                  <button
                    onClick={() => removeRow(r)}
                    title="Remover linha"
                    className="rounded p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
