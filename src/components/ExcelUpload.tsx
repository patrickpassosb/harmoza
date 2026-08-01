import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useHarmoza } from '@/lib/store'
import { isSupportedFile, SUPPORTED_EXTENSIONS } from '@/lib/fileParser'

interface Props {
  onLoaded?: (files: File[]) => void
  onDemo?: () => void
  loading?: boolean
  error?: string | null
  onDismissError?: () => void
  onSuccessClose?: () => void
}

export function ExcelUpload({
  onDemo,
  loading = false,
  error = null,
  onDismissError,
  onSuccessClose,
}: Props) {
  const { importFile, loadDemo, setView } = useHarmoza()
  const [dragOver, setDragOver] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      const unsupported = files.filter((f) => !isSupportedFile(f.name))
      const supported = files.filter((f) => isSupportedFile(f.name))

      if (unsupported.length > 0) {
        if (onDismissError) onDismissError()
        const names = unsupported.map((f) => f.name).join(', ')
        alert(`Formato não suportado: ${names}\nFormatos aceitos: ${SUPPORTED_EXTENSIONS}`)
      }

      if (!supported.length) return

      setBusy(true)
      try {
        await importFile(supported)
        setSuccessMsg(
          supported.length === 1
            ? `${supported[0].name} importada com sucesso!`
            : `${supported.length} arquivos importados com sucesso!`,
        )
        setView('sheet')
        navigate('/')
        if (onSuccessClose) onSuccessClose()
      } catch (err) {
        if (onDismissError) onDismissError()
        alert(err instanceof Error ? err.message : 'Não foi possível processar os arquivos.')
      } finally {
        setBusy(false)
      }
    },
    [importFile, setView, navigate, onDismissError, onSuccessClose],
  )

  const handleDemoClick = async () => {
    if (onDemo) {
      onDemo()
      return
    }
    setBusy(true)
    try {
      await loadDemo()
      setSuccessMsg('demonstracao_harmoza.xlsx')
      setView('sheet')
      navigate('/')
      if (onSuccessClose) onSuccessClose()
    } finally {
      setBusy(false)
    }
  }

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
          const files = Array.from(e.dataTransfer.files)
          if (files.length) handleFiles(files)
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
            ? 'Processando arquivos…'
            : 'Arraste seus arquivos ou clique para selecionar'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {SUPPORTED_EXTENSIONS} · processado localmente
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Você pode selecionar vários arquivos · máx 5 MB por arquivo · máx 10.000 linhas por aba
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.ods,.tsv,.txt"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            if (files.length) handleFiles(files)
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
        onClick={handleDemoClick}
        disabled={loading || busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0F766E]/30 bg-[#0F766E]/5 px-4 py-2.5 text-sm font-semibold text-[#0F766E] transition-colors hover:bg-[#0F766E]/10 disabled:opacity-50"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Carregar planilha de demonstração
      </button>

      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1 whitespace-pre-line">{error}</span>
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
