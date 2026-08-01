// HARMOZA — modo planilha: tabela editável + abas (criar, renomear, excluir)
import { useMemo, useState } from 'react'
import { Plus, Trash2, Pencil, Columns3, Rows3, Check, X, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useHarmoza } from '@/lib/store'
import type { CellValue } from '@/lib/types'

function fmtCell(v: CellValue, type: string): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    if (type === 'currency')
      return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    if (type === 'percent') return `${v.toLocaleString('pt-BR')}%`
    return String(v)
  }
  return String(v)
}

export function SheetView() {
  const {
    workbook,
    activeSheet,
    setActiveSheet,
    createSheet,
    renameSheet,
    deleteSheet,
    setCell,
    addRow,
    addColumn,
  } = useHarmoza()
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [newColName, setNewColName] = useState('')

  const sheet = activeSheet
  const cols = useMemo(() => sheet?.columns ?? [], [sheet])
  const rows = useMemo(() => sheet?.rows ?? [], [sheet])
  const MAX_ROWS = 120

  if (!workbook || !sheet) return null

  const handleCreate = () => {
    const name = newName.trim() || `Aba ${workbook.sheets.length + 1}`
    createSheet(name)
    setNewName('')
  }

  const handleRename = (id: string) => {
    const name = renameValue.trim()
    if (name) renameSheet(id, name)
    setRenamingId(null)
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Abas */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
        <Table2 className="ml-1 h-4 w-4 text-muted-foreground" />
        {workbook.sheets.map((s) => (
          <div key={s.id} className="group flex items-center gap-1">
            {renamingId === s.id ? (
              <div className="flex items-center gap-1">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(s.id)}
                  className="h-7 w-32"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRename(s.id)}
                >
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setRenamingId(null)}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setActiveSheet(s.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  sheet.id === s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {s.name}
                <span className="text-[10px] opacity-60">{s.rows.length}</span>
                <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setRenamingId(s.id)
                      setRenameValue(s.name)
                    }}
                    className="rounded p-0.5 hover:bg-black/10"
                    title="Renomear"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDeleteId(s.id)
                    }}
                    className="rounded p-0.5 hover:bg-red-500/20"
                    title="Excluir"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </button>
            )}
          </div>
        ))}

        {/* Nova aba */}
        <div className="flex items-center gap-1">
          {newName !== '' && workbook.sheets.length < 20 ? (
            <div className="flex items-center gap-1">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="h-7 w-32"
                placeholder="Nome da aba"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreate}>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-muted-foreground"
              onClick={() => setNewName(' ')}
            >
              <Plus className="h-3.5 w-3.5" /> Nova aba
            </Button>
          )}
        </div>
      </div>

      {/* Confirmação de exclusão */}
      {confirmDeleteId && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm flex items-center justify-between animate-fade-in">
          <span className="text-destructive-foreground">
            Excluir a aba{' '}
            <strong>“{workbook.sheets.find((s) => s.id === confirmDeleteId)?.name}”</strong>? Essa
            ação remove os dados dela.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                deleteSheet(confirmDeleteId)
                setConfirmDeleteId(null)
              }}
            >
              Excluir
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{sheet.name}</span>
            <span>·</span>
            <span>{cols.length} colunas</span>
            <span>·</span>
            <span>{rows.length} linhas</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={addRow}
              disabled={rows.length >= MAX_ROWS}
            >
              <Rows3 className="h-3.5 w-3.5" /> Adicionar linha
            </Button>
            {newColName !== '' ? (
              <div className="flex items-center gap-1">
                <Input
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCol()}
                  className="h-7 w-28"
                  placeholder="Nome da coluna"
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddCol}>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setNewColName(' ')}
              >
                <Columns3 className="h-3.5 w-3.5" /> Adicionar coluna
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-12 border-b border-r border-border bg-muted px-2 py-2 text-right text-xs font-medium text-muted-foreground">
                  #
                </th>
                {cols.map((c, ci) => (
                  <th
                    key={`${c.name}-${ci}`}
                    className="min-w-[120px] border-b border-r border-border bg-muted px-3 py-2 text-left font-semibold text-foreground"
                  >
                    <div className="flex flex-col">
                      <span>{c.name}</span>
                      <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wide">
                        {c.type}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={cols.length + 1}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Esta aba ainda não tem dados. Use “Adicionar linha” para começar.
                  </td>
                </tr>
              ) : (
                rows.map((row, ri) => (
                  <tr key={ri} className="group hover:bg-muted/40">
                    <td className="border-b border-r border-border bg-muted/40 px-2 py-1 text-right text-xs text-muted-foreground">
                      {ri + 1}
                    </td>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border-b border-r border-border px-2 py-0">
                        <CellEditor
                          value={cell}
                          type={cols[ci]?.type ?? 'text'}
                          onChange={(v) => setCell(sheet.id, ri, ci, v)}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  function handleAddCol() {
    const name = newColName.trim() || `Coluna ${cols.length + 1}`
    addColumn(name)
    setNewColName('')
  }
}

// Célula editável — mostra formatado e vira input ao clicar
function CellEditor({
  value,
  type,
  onChange,
}: {
  value: CellValue
  type: string
  onChange: (v: string | number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!editing) {
    return (
      <button
        className="block w-full min-h-[34px] px-2 py-1.5 text-left text-foreground hover:bg-primary/5 rounded transition-colors"
        onClick={() => {
          setDraft(value === null ? '' : String(value))
          setEditing(true)
        }}
        title="Clique para editar"
      >
        {fmtCell(value, type)}
      </button>
    )
  }

  return (
    <input
      autoFocus
      className="w-full min-h-[34px] rounded border border-primary bg-white px-2 py-1.5 text-foreground outline-none"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() === '') onChange(null)
        else {
          const n = Number(draft.replace(',', '.'))
          onChange(
            Number.isFinite(n) && draft.trim() !== '' && /^[-+]?[\d.,]+$/.test(draft.trim())
              ? n
              : draft,
          )
        }
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}
