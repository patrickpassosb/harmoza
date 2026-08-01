// HARMOZA — abas da planilha (alternar, criar, renomear, excluir)
import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import type { SheetData } from '@/lib/types'

interface Props {
  sheets: SheetData[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function SheetTabs({ sheets, activeId, onSelect, onCreate, onRename, onDelete }: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const commitCreate = () => {
    const name = newName.trim()
    if (name) onCreate(name)
    setCreating(false)
    setNewName('')
  }

  const commitRename = () => {
    if (renaming && renameValue.trim()) onRename(renaming, renameValue.trim())
    setRenaming(null)
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-white px-2 pt-1.5">
      {sheets.map((s) => (
        <div
          key={s.id}
          className={`group flex items-center gap-1 rounded-t-lg border border-b-0 px-3 py-1.5 text-sm transition-colors ${
            s.id === activeId
              ? 'border-border bg-white font-semibold text-[#172554]'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-[#172554]'
          }`}
        >
          {renaming === s.id ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setRenaming(null)
                }}
                className="w-24 rounded border border-[#0F766E] px-1 py-0.5 text-xs outline-none"
              />
              <button onClick={commitRename} className="text-[#0F766E]">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setRenaming(null)} className="text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <>
              <button onClick={() => onSelect(s.id)} className="max-w-[160px] truncate">
                {s.name}
              </button>
              <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => {
                    setRenaming(s.id)
                    setRenameValue(s.name)
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:text-[#172554]"
                  title="Renomear"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setConfirmDelete(s.id)}
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
              if (e.key === 'Enter') commitCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Nome da aba"
            className="w-28 rounded border border-border px-1.5 py-0.5 text-xs outline-none focus:border-[#0F766E]"
          />
          <button onClick={commitCreate} className="text-[#0F766E]">
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

      {confirmDelete && (
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
              <span className="font-semibold text-[#172554]">
                {sheets.find((s) => s.id === confirmDelete)?.name}
              </span>{' '}
              e seus dados serão removidos desta sessão. Essa ação não pode ser desfeita.
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
                  onDelete(confirmDelete)
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
    </div>
  )
}
