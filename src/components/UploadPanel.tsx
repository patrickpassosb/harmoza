/* HARMOZA — Importação de planilha Excel
   Upload drag-and-drop (.xlsx), preview de abas/colunas/tipos, botão demo.
   O arquivo é lido no navegador (SheetJS) — não sai da máquina. */

import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, FileSpreadsheet, Loader2, Sparkles, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHarmoza } from '@/lib/store'
import { cn } from '@/lib/utils'

type UploadStatus = 'idle' | 'loading' | 'success' | 'error'

interface UploadPanelProps {
  onImported?: (sheets: unknown[], fileName: string) => void
  onLoadDemo?: () => Promise<void>
  demoLoading?: boolean
  onSuccessClose?: () => void
}

export function UploadPanel({ onSuccessClose }: UploadPanelProps) {
  const { importFile, loadDemo, setView } = useHarmoza()
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleFile = useCallback(
    async (file: File) => {
      if (!/\.xlsx?$/i.test(file.name)) {
        setStatus('error')
        setError('Formato não suportado. Envie um arquivo .xlsx (Excel).')
        return
      }
      setStatus('loading')
      setError('')
      setFileName(file.name)
      try {
        await importFile(file)
        setStatus('success')
        setView('sheet')
        navigate('/')
        if (onSuccessClose) onSuccessClose()
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Não foi possível processar o arquivo.')
      }
    },
    [importFile, setView, navigate, onSuccessClose],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleDemo = async () => {
    setStatus('loading')
    setError('')
    setFileName('demonstracao_harmoza.xlsx')
    try {
      await loadDemo()
      setStatus('success')
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
          Envie um arquivo Excel (.xlsx) e a HARMOZA transforma seus dados em um dashboard
          inteligente.
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
            const f = e.target.files?.[0]
            if (f) handleFile(f)
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

      {status === 'success' && fileName && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" /> {fileName} importada com sucesso!
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
