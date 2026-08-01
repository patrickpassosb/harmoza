// HARMOZA — tabela estilo planilha, editável (células, linhas, colunas) + abas
// Assinatura compatível com Index.tsx: recebe sheets[], activeIndex, setters.
import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Columns3, Rows3 } from 'lucide-react'
import type { Sheet } from '@/lib/harmoza'
import { fmtCell } from '@/lib/format'

interface Props {
  sheets: Sheet[]
  activeIndex: number
  setActiveIndex: (i: number) => void
  updateSheets: (sheets: Sheet[]) => void
}

// Converte Sheet (Record<string,unknown>[]) para matriz de células para exibição
function sheetToMatrix(sheet: Sheet): { headers: string[]; rows: (string | number | null)[][] } {
  const headers = sheet.columns.map((c) => c.name)
  const rows = sheet.rows.map((r) => headers.map((h) => (r[h] as string | number | null) ?? null))
  return { headers, rows }
}

// Converte matriz de volta para Sheet
function matrixToSheet(sheet: Sheet, headers: string[], rows: (string | number | null)[][]): Sheet {
  return {
    ...sheet,
    columns: headers.map((name, i) => ({
      name,
      type: sheet.columns[i]?.type ?? 'text',
    })),
    rows: rows.map((row) => {
      const out: Record<string, unknown> = {}
      headers.forEach((h, i) => {
        out[h] = row[i]
      })
      return out
    }),
  }
}

export function SheetTable({ sheets, activeIndex, setActiveIndex, updateSheets }: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null)
  const [draft, setDraft] = useState('')

  const sheet = sheets[activeIndex]
  if (!sheet) return null

  const { headers, rows } = sheetToMatrix(sheet)
  const sheetType = (h: string) => sheet.columns.find((c) => c.name === h)?.type

  const commitEdit = (r: number, c: number) => {
    const type = sheetType(headers[c])
    let value: string | number | null = draft
    if (type === 'number' || type === 'currency' || type === 'percent') {
      const n = parseFloat(draft.replace(/[R$\s.]/g, '').replace(',', '.'))
      value = Number.isFinite(n) ? n : draft
    }
    if (draft.trim() === '') value = null
    const nextRows = rows.map((row, ri) =>
      ri === r ? row.map((v, ci) => (ci === c ? value : v)) : row,
    )
    updateSheets(
      sheets.map((s, si) => (si === activeIndex ? matrixToSheet(s, headers, nextRows) : s)),
    )
    setEditing(null)
  }

  const addRow = () => {
    const nextRows = [...rows, headers.map(() => null)]
    updateSheets(
      sheets.map((s, si) => (si === activeIndex ? matrixToSheet(s, headers, nextRows) : s)),
    )
  }

  const addColumn = () => {
    const name = `Coluna ${headers.length + 1}`
    const nextHeaders = [...headers, name]
    const nextRows = rows.map((r) => [...r, null])
    updateSheets(
      sheets.map((s, si) => (si === activeIndex ? matrixToSheet(s, nextHeaders, nextRows) : s)),
    )
  }

  const removeRow = (r: number) => {
    const nextRows = rows.filter((_, ri) => ri !== r)
    updateSheets(
      sheets.map((s, si) => (si === activeIndex ? matrixToSheet(s, headers, nextRows) : s)),
    )
  }

  const typeLabel = (t?: string) => {
    if (t === 'currency') return 'R$'
    if (t === 'date') return 'data'
    if (t === 'percent') return '%'
    return t ?? ''
  }

  return (
    <div className="space-y-3">
      {/* Abas */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-t-xl border border-b-0 border-border bg-white px-2 pt-1.5">
        {sheets.map((s, si) => (
          <div
            key={si}
            className={`group flex items-center gap-1 rounded-t-lg border border-b-0 px-3 py-1.5 text-sm transition-colors ${
              si === activeIndex
                ? 'border-border bg-white font-semibold text-[#172554]'
                : 'border-transparent text-muted-foreground hover:bg-muted hover:text-[#172554]'
            }`}
          >
            {renaming === si ? (
              <span className="flex items-center gap-1">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameValue.trim()) {
                      updateSheets(
                        sheets.map((x, xi) => (xi === si ? { ...x, name: renameValue.trim() } : x)),
                      )
                      setRenaming(null)
                    }
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                  className="w-24 rounded border border-[#0F766E] px-1 py-0.5 text-xs outline-none"
                />
                <button
                  onClick={() => {
                    if (renameValue.trim())
                      updateSheets(
                        sheets.map((x, xi) => (xi === si ? { ...x, name: renameValue.trim() } : x)),
                      )
                    setRenaming(null)
                  }}
                  className="text-[#0F766E]"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setRenaming(null)} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : (
              <>
                <button onClick={() => setActiveIndex(si)} className="max-w-[160px] truncate">
                  {s.name}
                </button>
                <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setRenaming(si)
                      setRenameValue(s.name)
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:text-[#172554]"
                    title="Renomear"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(si)}
                    className="rounded p-0.5 text-muted-foreground hover:text-red-600"
                    title="Excluir"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </>
            )}
          </div>
        ))}

        {creating ? (
          <span className="flex items-center gap-1 rounded-t-lg border border-b-0 border-[#0F766E]/40 bg-white px-2 py-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  updateSheets([...sheets, { name: newName.trim(), columns: [], rows: [] }])
                  setActiveIndex(sheets.length)
                  setCreating(false)
                  setNewName('')
                }
                if (e.key === 'Escape') setCreating(false)
              }}
              placeholder="Nome da aba"
              className="w-28 rounded border border-border px-1.5 py-0.5 text-xs outline-none focus:border-[#0F766E]"
            />
            <button
              onClick={() => {
                if (newName.trim()) {
                  updateSheets([...sheets, { name: newName.trim(), columns: [], rows: [] }])
                  setActiveIndex(sheets.length)
                }
                setCreating(false)
                setNewName('')
              }}
              className="text-[#0F766E]"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setCreating(false)} className="text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-t-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-[#0F766E]"
          >
            <Plus className="h-3.5 w-3.5" /> Nova aba
          </button>
        )}
      </div>

      {/* Confirmação de exclusão */}
      {confirmDelete !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-elevation"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[#172554]">Excluir aba?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A aba{' '}
              <span className="font-semibold text-[#172554]">{sheets[confirmDelete]?.name}</span> e
              seus dados serão removidos desta sessão. Essa ação não pode ser desfeita.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (sheets.length > 1) {
                    updateSheets(sheets.filter((_, si) => si !== confirmDelete))
                    if (activeIndex >= confirmDelete) setActiveIndex(Math.max(0, activeIndex - 1))
                  }
                  setConfirmDelete(null)
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <span className="text-sm font-semibold text-[#172554]">
            {sheet.name}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {rows.length} linhas · {headers.length} colunas
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
                {headers.map((h, c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap border-l border-white/10 px-3 py-2 text-xs font-semibold"
                  >
                    {h}
                    <span className="ml-1.5 text-[10px] font-normal uppercase text-white/50">
                      {typeLabel(sheetType(h))}
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
                    colSpan={headers.length + 2}
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
                            {fmtCell(v, sheetType(headers[c])) || (
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
    </div>
  )
}
