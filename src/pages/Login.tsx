// HARMOZA — login com conta de demonstração visível (auto-contido: só pb + logo + lucide)
import { useState } from 'react'
import { Mail, Lock, Loader2, Sparkles } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { HarmozaLogo } from '@/components/HarmozaLogo'

interface Props {
  onAuthed: () => void
}

const DEMO_EMAIL = 'demo@harmoza.com.br'
const DEMO_PASS = 'demo1234'

export function Login({ onAuthed }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doLogin = async (em: string, pw: string) => {
    setLoading(true)
    setError(null)
    try {
      await pb.collection('users').authWithPassword(em, pw)
      onAuthed()
    } catch {
      setError('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) void doLogin(email, password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F7F4] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <HarmozaLogo size={56} />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#172554]">
            Entre na HARMOZA
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suas planilhas viram um sistema de gestão inteligente.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-elevation">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#172554]">E-mail</label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 focus-within:border-[#0F766E]">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#172554]">Senha</label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 focus-within:border-[#0F766E]">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#172554] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#172554]/90 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              ou
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="rounded-xl border border-[#0F766E]/20 bg-[#0F766E]/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0F766E]" />
              <span className="text-xs font-semibold text-[#0F766E]">Conta de demonstração</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Use para testar sem criar conta:</p>
            <p className="mt-1 rounded-lg bg-white px-3 py-1.5 font-mono text-xs text-[#172554]">
              {DEMO_EMAIL} · {DEMO_PASS}
            </p>
            <button
              onClick={() => void doLogin(DEMO_EMAIL, DEMO_PASS)}
              disabled={loading}
              className="mt-3 w-full rounded-lg bg-[#0F766E] py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0F766E]/90 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
              ) : (
                'Entrar como demonstração →'
              )}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          HARMOZA — a gestão que se encaixa no seu negócio
        </p>
      </div>
    </div>
  )
}

export default Login
