/* HARMOZA — Login / Cadastro
   Conta de demonstração visível na tela para facilitar testes. */

import { useState } from 'react'
import { Loader2, Sparkles, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HarmozaLogo } from '@/components/Logo'
import { useAuth } from '@/hooks/use-auth'

const DEMO_EMAIL = 'demo@harmoza.com.br'
const DEMO_PASSWORD = 'demo1234'

export default function Login() {
  const { signIn, signUp, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email || DEMO_EMAIL, password || DEMO_PASSWORD)
      } else {
        await signUp(name, email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <HarmozaLogo />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A gestão que se encaixa no seu negócio — do Excel ao dashboard inteligente.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevation">
          {/* Conta demo visível */}
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setEmail(DEMO_EMAIL)
              setPassword(DEMO_PASSWORD)
              void submit()
            }}
            disabled={busy}
            className="mb-4 flex w-full items-center gap-3 rounded-xl border border-[#D97706]/40 bg-[#D97706]/10 p-3 text-left transition-colors hover:bg-[#D97706]/15"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D97706] text-white">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">
                Entrar com conta de teste
              </span>
              <span className="block text-xs text-muted-foreground">
                {DEMO_EMAIL} · senha {DEMO_PASSWORD}
              </span>
            </span>
            <KeyRound className="h-4 w-4 text-[#D97706]" />
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              ou entre com
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy || loading}>
              {busy || loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Ainda não tem conta?{' '}
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode('signup')}
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode('login')}
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          HARMOZA · ἁρμόζω — unir, encaixar, ajustar as partes para funcionarem juntas.
        </p>
      </div>
    </div>
  )
}
