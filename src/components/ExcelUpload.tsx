// HARMOZA — área de upload de planilha Excel
import { useCallback, useRef, useState } from 'react'
import {
  FileSpreadsheet,
  UploadCloud,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHarmoza } from '@/lib/store'

export function ExcelUpload({ compact = false }: { compact?: boolean }) {
  const { importFile, loadDemo, importState, importError, warnings, fileName, reset, workbook } =
    useHarmoza()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const onFile = useCallback(
    async (file?: File | null) => {
      if (!file) return
      const isXlsx = /\.(xlsx|xls)$/i.test(file.name)
      if (!isXlsx) {
        alert('Formato não suportado. Envie um arquivo .xlsx (Excel).')
        return
      }
      await importFile(file)
    },
    [importFile],
  )

  if (importState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-card p-10 text-center animate-fade-in">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 font-medium text-foreground">Lendo sua planilha…</p>
        <p className="text-sm text-muted-foreground">
          Identificando abas, colunas e tipos de dados
        </p>
      </div>
    )
  }

  if (importState === 'error') {
    return (
      <div className="rounded-2xl border-2 border-dashed border-destructive/40 bg-destructive/5 p-10 text-center animate-fade-in">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <p className="mt-4 font-semibold text-destructive">Não foi possível importar o arquivo</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {importError || 'Ocorreu um erro ao processar a planilha.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            Tentar novamente
          </Button>
          <Button onClick={loadDemo}>Carregar demonstração</Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
    )
  }

  if (importState === 'success' && workbook && !compact) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                {workbook.sheets.length} aba(s) identificadas
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            Trocar arquivo
          </Button>
        </div>
        {warnings.length > 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}
      </div>
    )
  }

  // idle — nenhum arquivo importado
  return (
    <div
      className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
        dragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-primary/25 bg-card hover:border-primary/50 hover:bg-primary/[0.03]'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        onFile(e.dataTransfer.files?.[0])
      }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
        <UploadCloud className="h-7 w-7" />
      </div>
      <p className="mt-4 text-lg font-semibold text-foreground">Arraste sua planilha Excel aqui</p>
      <p className="mt-1 text-sm text-muted-foreground">ou clique para escolher um arquivo .xlsx</p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
        <Button onClick={(e) => e.stopPropagation()}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Escolher arquivo
        </Button>
        <span className="text-xs text-muted-foreground">ou</span>
        <Button
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            loadDemo()
          }}
        >
          <Sparkles className="mr-2 h-4 w-4 text-harmoza-orange" />
          Carregar demonstração
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        O arquivo é processado no seu navegador — seus dados não saem da sua máquina.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  )
}
