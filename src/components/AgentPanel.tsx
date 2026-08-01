import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Mic, Square, Volume2, Send, Loader2, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useHarmoza } from '@/lib/store'

function getRecognition(): any {
  const w = window as any
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}
const SUGGESTIONS = [
  'Qual foi o total de vendas?',
  'Mostre as vendas por mês',
  'Crie um gráfico de vendas por região',
  'Qual região tem o melhor resultado?',
]

export function AgentPanel() {
  const { agentOpen, setAgentOpen, agentMessages, agentStatus, sendAgentText, clearAgent, speak } =
    useHarmoza()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [agentMessages, interim, agentStatus])
  useEffect(() => {
    if (!agentOpen && recRef.current) {
      recRef.current.abort()
      setListening(false)
    }
  }, [agentOpen])

  const stopListening = useCallback(() => {
    recRef.current?.abort()
    recRef.current = null
    setListening(false)
    setInterim('')
  }, [])
  const startListening = useCallback(() => {
    const rec = getRecognition()
    if (!rec) {
      alert('Seu navegador não suporta reconhecimento de voz. Use o Chrome.')
      return
    }
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (e: any) => {
      let final = '',
        inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) final += r[0].transcript
        else inter += r[0].transcript
      }
      if (final) {
        setText((t) => (t ? t + ' ' + final : final))
        setInterim('')
      } else setInterim(inter)
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
    }
    rec.onerror = () => {
      setListening(false)
      setInterim('')
    }
    recRef.current = rec
    setListening(true)
    rec.start()
  }, [])
  const send = useCallback(
    async (value?: string) => {
      const msg = (value ?? text).trim()
      if (!msg || agentStatus === 'processing' || agentStatus === 'executing') return
      setText('')
      stopListening()
      await sendAgentText(msg)
    },
    [text, agentStatus, sendAgentText, stopListening],
  )
  const statusLabel: Record<string, string> = {
    idle: 'Pronto para ajudar',
    listening: 'Ouvindo…',
    processing: 'Processando…',
    executing: 'Executando ação…',
    done: 'Ação concluída',
    unclear: 'Não entendi',
    error: 'Ocorreu um erro',
  }
  if (!agentOpen) return null
  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Agente HARMOZA</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={
                  'h-1.5 w-1.5 rounded-full ' +
                  (agentStatus === 'listening' ? 'animate-pulse bg-red-500' : 'bg-emerald-500')
                }
              />
              {statusLabel[agentStatus] ?? 'Pronto'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAgentOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {agentMessages.length === 0 && (
          <div className="mt-8 text-center">
            <p className="font-medium text-foreground">Olá! Sou o agente da HARMOZA 👋</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Posso consultar seus dados, criar gráficos e gerenciar o dashboard. Fale ou digite:
            </p>
            <div className="mx-auto mt-4 flex max-w-xs flex-col gap-1.5 text-left">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  onClick={() => void send(s)}
                >
                  “{s}”
                </button>
              ))}
            </div>
          </div>
        )}
        {agentMessages.map((m) => (
          <div
            key={m.id}
            className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={'flex max-w-[85%] gap-2 ' + (m.role === 'user' ? 'flex-row-reverse' : '')}
            >
              <div
                className={
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ' +
                  (m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[#0F766E]/15 text-[#0F766E]')
                }
              >
                {m.role === 'user' ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>
              <div
                className={
                  'rounded-2xl px-3.5 py-2.5 text-sm ' +
                  (m.role === 'user'
                    ? 'rounded-tr-sm bg-primary text-primary-foreground'
                    : 'rounded-tl-sm border border-border bg-card text-foreground')
                }
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                {m.role === 'assistant' && (
                  <button
                    className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => speak(m.content)}
                  >
                    <Volume2 className="h-3.5 w-3.5" /> Ouvir de novo
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {interim && (
          <div className="flex justify-end">
            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-3.5 py-2.5 text-sm text-muted-foreground italic">
              {interim}…
            </div>
          </div>
        )}
        {(agentStatus === 'processing' || agentStatus === 'executing') && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {agentStatus === 'executing'
              ? 'Executando ação no dashboard…'
              : 'Analisando seus dados…'}
          </div>
        )}
      </div>
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button
            variant={listening ? 'destructive' : 'outline'}
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={listening ? stopListening : startListening}
            title={listening ? 'Parar gravação' : 'Falar'}
          >
            {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void send()}
            placeholder={listening ? 'Fale agora…' : 'Pergunte ou dê um comando…'}
            className="h-10"
          />
          <Button
            className="h-10 w-10 shrink-0"
            size="icon"
            onClick={() => void send()}
            disabled={!text.trim() || agentStatus === 'processing' || agentStatus === 'executing'}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Voz usa os recursos do navegador.
        </p>
      </div>
    </div>
  )
}

export function AgentFab() {
  const { setAgentOpen, agentStatus } = useHarmoza()
  const busy =
    agentStatus === 'processing' || agentStatus === 'executing' || agentStatus === 'listening'
  return (
    <Button
      className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-elevation"
      size="icon"
      onClick={() => setAgentOpen(true)}
      title="Abrir agente"
    >
      {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Bot className="h-6 w-6" />}
    </Button>
  )
}
