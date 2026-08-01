import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, Loader2, Sparkles, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHarmoza } from '@/lib/store'
import { isSupportedFile, SUPPORTED_EXTENSIONS } from '@/lib/fileParser'
import { cn } from '@/lib/utils'

type UploadStatus = 'idle' | 'loading' | 'success' | 'error'

export function UploadPanel({ onSuccessClose }: { onSuccessClose?: () => void }) {
  const { importFile, loadDemo, setView } = useHarmoza()
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState('')
  const [successText, setSuccessText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      const unsupported = files.filter((f) => !isSupportedFile(f.name))
      const supported = files.filter((f) => isSupportedFile(f.name))

      if (unsupported.length > 0) {
        const names = unsupported.map((f) => f.name).join(', ')
        setStatus('error')
        setError(`Formato não suportado: ${names}. Use ${SUPPORTED_EXTENSIONS}.`)
        if (!supported.length) return
      }

      setStatus('loading')
      setError('')
      setSuccessText('')
      try {
        await importFile(supported)
        setStatus('success')
        setSuccessText(
          supported.length === 1
            ? `${supported[0].name} importada com sucesso!`
            : `${supported.length} arquivos importados com sucesso!`,
        )
        setView('sheet')
        navigate('/')
        if (onSuccessClose) onSuccessClose()
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Não foi possível processar os arquivos.')
      }
    },
    [importFile, setView, navigate, onSuccessClose],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length) handleFiles(files)
    },
    [handleFiles],
  )

  const handleDemo = async () => {
    setStatus('loading')
    setError('')
    setSuccessText('')
    try {
      await loadDemo()
      setStatus('success')
      setSuccessText('demonstracao_harmoza.xlsx')
      setView('sheet')
      navigate('/')
      if (onSuccessClose) onSuccessClose()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Falha ao carregar a demonstração.')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Importe sua planilha</h2>
        <p className="mt-1 text-muted-foreground">
          Envie arquivos Excel, CSV ou outros formatos e a HARMOZA transforma seus dados em um
          dashboard inteligente.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all',
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-muted-foreground/30 bg-card hover:border-primary/50 hover:bg-primary/[0.03]',
        )}
      >
        {status === 'loading' ? (
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        ) : (
          <UploadCloud className="mb-3 h-10 w-10 text-primary/70" />
        )}
        <p className="text-base font-medium text-foreground">
          {status === 'loading'
            ? 'Processando arquivos…'
            : 'Arraste seus arquivos ou clique para selecionar'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {SUPPORTED_EXTENSIONS} · processado localmente
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Vários arquivos suportados · máx 5 MB por arquivo · máx 10.000 linhas por aba
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
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          ou
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleDemo}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-[#D97706]" />
        )}
        Carregar planilha de demonstração
      </Button>

      {status === 'success' && successText && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" /> {successText}
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="whitespace-pre-line">{error}</span>
        </div>
      )}
    </div>
  )
}
