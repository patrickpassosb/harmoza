import { useState, useEffect, useCallback } from 'react'
import {
  KeyRound,
  Plus,
  Trash2,
  Loader2,
  Plug,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  listTokens,
  createToken,
  revokeToken,
  testToken,
  type ApiToken,
} from '@/services/api-tokens'
import { ApiDocs } from './ApiDocs'

const validityOptions = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
  { label: '1 ano', value: '365' },
  { label: 'Nunca', value: 'never' },
]

const validityMap: Record<string, number | null> = {
  '7': 7,
  '30': 30,
  '90': 90,
  '365': 365,
  never: null,
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function IntegrationSettings() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [tokenName, setTokenName] = useState('')
  const [validity, setValidity] = useState('30')
  const [generating, setGenerating] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<ApiToken | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [testValue, setTestValue] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null)

  const loadTokens = useCallback(async () => {
    try {
      const list = await listTokens()
      setTokens(list)
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  const handleGenerate = async () => {
    if (!tokenName.trim()) {
      toast.error('Informe um nome para o token.')
      return
    }
    setGenerating(true)
    try {
      const res = await createToken(tokenName.trim(), validityMap[validity] ?? null)
      setGeneratedToken(res.token)
      setShowTokenDialog(true)
      setTokenName('')
      setValidity('30')
      await loadTokens()
      toast.success('Token gerado com sucesso!')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar token.')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await revokeToken(revokeTarget.id)
      await loadTokens()
      toast.success('Token revogado com sucesso!')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao revogar token.')
    } finally {
      setRevoking(false)
      setRevokeTarget(null)
    }
  }

  const handleTest = async () => {
    if (!testValue.trim()) {
      toast.error('Cole um token para testar.')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testToken(testValue.trim())
      setTestResult(res)
    } catch (err: any) {
      setTestResult({ valid: false, message: err?.message || 'Erro ao testar token.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[#172554]">Integração & API</h3>
        <p className="text-xs text-muted-foreground">
          Gere tokens de API para que seu ERP envie dados automaticamente para a HARMOZA.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#172554]">
          <KeyRound className="h-4 w-4 text-[#0F766E]" /> Gerar novo token
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1">
            <Label className="text-xs">Nome do token</Label>
            <Input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Ex: Integração Bling"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Validade</Label>
            <Select value={validity} onValueChange={setValidity}>
              <SelectTrigger className="w-[130px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {validityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-[#0F766E] text-xs hover:bg-[#0F766E]/90"
            >
              {generating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Gerar Token
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#172554]">Tokens ativos ({tokens.length})</p>
        {tokens.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Nenhum token ativo. Gere um token acima para começar.
          </p>
        ) : (
          <div className="space-y-2">
            {tokens.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-[#172554]">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Criado em {formatDate(t.createdAt)} · Expira em {formatDate(t.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRevokeTarget(t)}
                  className="text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Revogar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#172554]">
          <Plug className="h-4 w-4 text-[#0F766E]" /> Testar Conexão
        </div>
        <p className="text-[11px] text-muted-foreground">
          Cole um token de API para validar se ele está ativo e funcional.
        </p>
        <div className="flex gap-2">
          <Input
            value={testValue}
            onChange={(e) => setTestValue(e.target.value)}
            placeholder="hmz_..."
            className="text-sm font-mono"
          />
          <Button
            onClick={handleTest}
            disabled={testing}
            variant="outline"
            className="text-xs whitespace-nowrap"
          >
            {testing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Testar Conexão
          </Button>
        </div>
        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
              testResult.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {testResult.valid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      <ApiDocs />

      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Token gerado com sucesso!</DialogTitle>
            <DialogDescription>
              Copie seu token agora. Ele não será exibido novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs font-medium text-amber-800">
                  Salve este token agora — ele não será exibido novamente.
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <code className="block break-all text-xs font-mono text-[#172554]">
                {generatedToken}
              </code>
            </div>
            <Button
              onClick={() => {
                if (generatedToken) {
                  navigator.clipboard.writeText(generatedToken)
                  toast.success('Token copiado!')
                }
              }}
              className="w-full bg-[#0F766E] text-xs hover:bg-[#0F766E]/90"
            >
              Copiar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar token?</AlertDialogTitle>
            <AlertDialogDescription>
              {revoking
                ? 'Revogando...'
                : `O token "${revokeTarget?.name}" será imediatamente invalidado. Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? 'Revogando…' : 'Revogar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
