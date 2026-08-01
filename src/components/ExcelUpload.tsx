// HARMOZA — área de upload de planilha (.xlsx) com estado
import { useCallback, useRef, useState } from 'react'
import { UploadCloud, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { HarmozaLogo } from './Logo'

interface Props {
  onLoaded: (wb: { fileName: string; sheets: import('@/lib/types').SheetData[] }) => void
  onDemo: () => void
  loading?: boolean
  error?: string | null
  onDismissError?: () => void
}

export function ExcelUpload({
  onLoaded,
  onDemo,
  loading = false,
  error = null,
  onDismissError,
}: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [successName, setSuccessName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handleFiles = useCallback(
    async (file?: File) => {
      if (!file) return
      if (!/\.xlsx?$/i.test(file.name)) {
        if (onDismissError) onDismissError()
        alert('Formato não suportado. Envie um arquivo .xlsx (Excel).')
        return
      }
      setBusy(true)
      try {
        const mod = await import('@/lib/excel')
        const { parseExcelFile } = mod
        const res = await parseExcelFile(file)
        onLoaded({ fileName: res.workbook.fileName, sheets: res.workbook.sheets })
        setSuccessName(res.workbook.fileName)
      } catch (err) {
        if (onDismissError) onDismissError()
        alert(err instanceof Error ? err.message : 'Não foi possível processar o arquivo.')
      } finally {
        setBusy(false)
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
          handleFiles(e.dataTransfer.files?.[0])
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all ${
          dragOver
            ? 'border-[#0F766E] bg-[#0F766E]/5 scale-[1.01]'
            : 'border-border bg-white hover:border-[#0F766E]/50'
        }`}
      >
        {busy || loading ? (
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-[#0F766E]" />
        ) : (
          <UploadCloud className="mb-3 h-10 w-10 text-[#172554]/60" />
        )}
        <p className="text-base font-medium text-[#172554]">
          {busy || loading
            ? 'Processando arquivo…'
            : 'Arraste seu arquivo ou clique para selecionar'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Somente arquivos .xlsx · processado localmente
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          ou
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={onDemo}
        disabled={loading || busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0F766E]/30 bg-[#0F766E]/5 px-4 py-2.5 text-sm font-semibold text-[#0F766E] transition-colors hover:bg-[#0F766E]/10 disabled:opacity-50"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Carregar planilha de demonstração
      </button>

      {successName && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successName} importada com sucesso!</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          {onDismissError && (
            <button onClick={onDismissError} className="text-red-500 hover:text-red-700">
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function UploadArea(props: Props) {
  return <ExcelUpload {...props} />
}
