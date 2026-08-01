// HARMOZA — tabela estilo planilha, editável (células, linhas, colunas)
import { useState } from 'react'
import { Columns3, Rows3, Trash2 } from 'lucide-react'
import type { CellValue, Sheet } from '@/lib/types'
import { fmtCell } from '@/lib/format'

interface Props {
  sheet: Sheet
  onChange: (sheet: Sheet) => void
}

export function SheetTable({ sheet, onChange }: Props) {
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null)
  const [draft, setDraft] = useState<string>('')

  const updateCell = (r: number, c: number, value: CellValue) => {
    const rows = sheet.rows.map((row, ri) =>
      ri === r ? row.map((v, ci) => (ci === c ? value : v)) : row,
    )
    onChange({ ...sheet, rows })
  }

  const addRow = () => {
    const row: CellValue[] = sheet.columns.map(() => null)
    onChange({ ...sheet, rows: [...sheet.rows, row] })
  }

  const addColumn = () => {
    const name = `Coluna ${sheet.columns.length + 1}`
    onChange({
      ...sheet,
      columns: [...sheet.columns, name],
      rows: sheet.rows.map((r) => [...r, null]),
      columnTypes: { ...sheet.columnTypes, [name]: 'text' },
    })
  }

  const removeRow = (r: number) => {
    onChange({ ...sheet, rows: sheet.rows.filter((_, ri) => ri !== r) })
  }

  const startEdit = (r: number, c: number, v: CellValue) => {
    setEditing({ r, c })
    setDraft(v === null ? '' : String(v))
  }

  const commitEdit = (r: number, c: number) => {
    const type = sheet.columnTypes[sheet.columns[c]]
    let value: CellValue = draft
    if (type === 'number' || type === 'currency' || type === 'percent') {
      const n = parseFloat(draft.replace(/[R$\s.]/g, '').replace(',', '.'))
      value = Number.isFinite(n) ? n : draft
    }
    updateCell(r, c, value)
    setEditing(null)
  }

  const typeLabel = (t?: string) => {
    if (t === 'currency') return 'R$'
    if (t === 'date') return 'data'
    if (t === 'percent') return '%'
    return t ?? ''
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <span className="text-sm font-semibold text-[#172554]">
          {sheet.name}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {sheet.rows.length} linhas · {sheet.columns.length} colunas
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
              {sheet.columns.map((col, c) => (
                <th
                  key={c}
                  className="whitespace-nowrap border-l border-white/10 px-3 py-2 text-xs font-semibold"
                >
                  {col}
                  <span className="ml-1.5 text-[10px] font-normal uppercase text-white/50">
                    {typeLabel(sheet.columnTypes[col])}
                  </span>
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {sheet.rows.length === 0 && (
              <tr>
                <td
                  colSpan={sheet.columns.length + 2}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  Esta aba está vazia. Adicione linhas ou colunas.
                </td>
              </tr>
            )}
            {sheet.rows.map((row, r) => (
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
                          onClick={() => startEdit(r, c, v)}
                          className="block w-full truncate rounded px-1 py-1 text-left text-[13px] text-[#1e293b] hover:bg-[#0F766E]/10"
                          title="Clique para editar"
                        >
                          {fmtCell(v, sheet.columnTypes[sheet.columns[c]]) || (
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
                    className="rounded p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
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
