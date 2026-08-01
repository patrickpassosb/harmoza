// HARMOZA — área de upload de planilha (.xlsx) + botão de demonstração
// Interface compatível com AppShell: onLoaded({fileName, sheets}) / onDemo / loading / error.
import { useCallback, useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, Loader2, X } from 'lucide-react'
import { parseWorkbook, type ParsedWorkbook } from '@/lib/excel'
import { isSupportedFile, SUPPORTED_EXTENSIONS } from '@/lib/fileParser'

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
      if (!isSupportedFile(file.name)) {
        onDismissError()
        alert(`Formato não suportado: ${file.name}\nUse ${SUPPORTED_EXTENSIONS}.`)
        return
      }
      setFileName(file.name)
      try {
        const wb = await parseWorkbook(file)
        onLoaded(wb)
      } catch (err) {
        onDismissError()
        alert(err instanceof Error ? err.message : 'Não foi possível processar o arquivo.')
      }
    },
    [onLoaded, onDismissError],
  )

  return (
    <div className="animate-fade-in">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) void handleFile(f)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all ${
          dragOver
            ? 'border-[#0F766E] bg-[#0F766E]/5 scale-[1.01]'
            : 'border-muted-foreground/30 bg-card hover:border-[#0F766E]/50 hover:bg-[#0F766E]/[0.03]'
        }`}
      >
        {loading ? (
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-[#0F766E]" />
        ) : (
          <UploadCloud className="mb-3 h-10 w-10 text-[#172554]/60" />
        )}
        <p className="text-base font-medium text-[#172554]">
          {loading
            ? 'Processando arquivo…'
            : fileName
              ? `Arquivo: ${fileName}`
              : 'Arraste seu arquivo ou clique para selecionar'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {SUPPORTED_EXTENSIONS} · processado localmente
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.ods,.tsv,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
            e.target.value = ''
          }}
        />
      </div>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          ou
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={onDemo}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D97706]/30 bg-[#D97706]/5 py-2.5 text-sm font-semibold text-[#B45309] transition-colors hover:bg-[#D97706]/10 disabled:opacity-40"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Carregar planilha de demonstração
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <X className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer" onClick={onDismissError} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
