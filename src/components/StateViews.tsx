import { FileSpreadsheet, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import { HarmozaLogo } from './Logo'

export function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#172554]/5">
        <HarmozaLogo size={44} showName={false} />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-[#172554]">
        Comece importando sua planilha
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Arraste um arquivo <span className="font-medium text-[#172554]">.xlsx</span> ou use a
        planilha de demonstração.
      </p>
    </div>
  )
}

export function LoadingState({ label = 'Importando planilha…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#0F766E]" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <h3 className="text-base font-semibold text-red-700">Não foi possível processar o arquivo</h3>
      <p className="text-sm text-red-600/80">{message}</p>
    </div>
  )
}

export function DashboardGenerating() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-[#0F766E]/20" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F766E] text-white">
          <Sparkles className="h-7 w-7" />
        </div>
      </div>
      <p className="text-sm font-medium text-[#172554]">Gerando dashboard inteligente…</p>
      <p className="text-xs text-muted-foreground">
        Analisando colunas e calculando indicadores com os dados reais.
      </p>
    </div>
  )
}

export function NoDataHint() {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white/60 p-8 text-center">
      <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
      <h3 className="text-base font-semibold text-[#172554]">Nenhuma aba com dados</h3>
      <p className="text-sm text-muted-foreground">
        Importe uma planilha ou crie uma nova aba para começar.
      </p>
    </div>
  )
}
