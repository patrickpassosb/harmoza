// HARMOZA — estados visuais (vazio / carregando / erro / dashboard gerando)
import type { ReactNode } from 'react'
import { FileSpreadsheet, Loader2, Sparkles, AlertTriangle } from 'lucide-react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#172554]/5">
        {icon ?? <FileSpreadsheet className="h-8 w-8 text-[#0F766E]" />}
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-[#172554]">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Importando planilha…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#0F766E]" />
      <p className="text-sm font-medium text-[#172554]">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 h-8 w-8 text-red-500" />
      <p className="text-sm font-medium text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-[#172554] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554]/90"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export function DashboardGenerating() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <Sparkles className="mb-4 h-8 w-8 animate-pulse text-[#D97706]" />
      <p className="text-sm font-medium text-[#172554]">Gerando dashboard inteligente…</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Analisando colunas e criando os indicadores mais relevantes
      </p>
    </div>
  )
}
