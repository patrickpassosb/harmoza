// HARMOZA — área de upload de planilha (.xlsx) + botão de demonstração
import { useCallback, useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, Loader2, X } from 'lucide-react'
import { parseWorkbook, type ParsedWorkbook } from '@/lib/excel'

interface Props {
  onLoaded: (wb: ParsedWorkbook) => void
  onDemo: () => void
  loading: boolean
  error: string | null
  onDismissError: () => void
}

export function UploadArea({ onLoaded, onDemo, loading, error, onDismissError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        onLoaded({ fileName: file.name, sheets: [] })
        return
      }
      setFileName(file.name)
      try {
        const wb = await parseWorkbook(file)
        onLoaded(wb)
      } catch (err) {
        // erro tratado pelo AppShell
      }
    },
    [onLoaded],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) void handleFile(file)
    },
    [handleFile],
  )

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Importar planilha Excel"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`group flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          dragOver
            ? 'border-[#0F766E] bg-[#0F766E]/5 scale-[1.01]'
            : 'border-[#172554]/25 bg-white hover:border-[#172554]/40 hover:bg-[#172554]/[0.02]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
            dragOver ? 'bg-[#0F766E] text-white' : 'bg-[#172554]/10 text-[#172554]'
          }`}
        >
          {loading ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
        </div>
        {fileName ? (
          <div className="flex items-center gap-2 text-sm font-medium text-[#172554]">
            <FileSpreadsheet className="h-4 w-4 text-[#0F766E]" />
            {fileName}
          </div>
        ) : (
          <>
            <p className="text-base font-semibold text-[#172554]">
              {loading ? 'Lendo arquivo…' : 'Arraste sua planilha ou clique para enviar'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Formatos aceitos: .xlsx</p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={onDismissError}
            aria-label="Fechar erro"
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          ou
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={onDemo}
        disabled={loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#0F766E]/30 bg-[#0F766E]/5 px-4 py-3 text-sm font-semibold text-[#0F766E] transition-colors hover:bg-[#0F766E]/10 disabled:opacity-50"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Carregar planilha de demonstração
      </button>
    </div>
  )
}
