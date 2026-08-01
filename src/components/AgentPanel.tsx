import { useCallback, useEffect, useRef, useState } from 'react'
import {
  X,
  Mic,
  Square,
  Volume2,
  Send,
  Loader2,
  Bot,
  User,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useHarmoza } from '@/lib/store'
import {
  speak as speakTTS,
  stopSpeaking,
  isSpeechSynthesisSupported,
  isSpeechSupported,
} from '@/lib/speech'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Qual foi o total de vendas?',
  'Mostre as vendas por mês',
  'Crie um gráfico de vendas por região',
  'Qual região tem o melhor resultado?',
]

function getRecognition(): any {
  const w = window as any
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export function AgentPanel() {
  const {
    agentOpen,
    setAgentOpen,
    agentMessages,
    agentStatus,
    agentError,
    sendAgentText,
    retryAgent,
  } = useHarmoza()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const recRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const ttsSupported = isSpeechSynthesisSupported()
  const micSupported = isSpeechSupported()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [agentMessages, interim, agentStatus, agentError])

  useEffect(() => {
    if (!agentOpen) {
      recRef.current?.abort()
      setListening(false)
      stopSpeaking()
      setPlayingId(null)
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
    if (!rec) return
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (e: any) => {
      let final = ''
      let inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) final += r[0].transcript
        else inter += r[0].transcript
      }
      if (final) {
        setText((t) => (t ? t + ' ' + final : final))
        setInterim('')
      } else {
        setInterim(inter)
      }
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
      stopSpeaking()
      setPlayingId(null)
      await sendAgentText(msg)
    },
    [text, agentStatus, sendAgentText, stopListening],
  )

  const handleCopy = useCallback(async (id: string, content: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(content)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = content
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }, [])

  const handleListen = useCallback(
    (id: string, content: string) => {
      if (playingId === id) {
        stopSpeaking()
        setPlayingId(null)
        return
      }
      stopSpeaking()
      speakTTS(content, () => setPlayingId(null))
      setPlayingId(id)
    },
    [playingId],
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

  const isBusy = agentStatus === 'processing' || agentStatus === 'executing'

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
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  listening ? 'animate-pulse bg-red-500' : 'bg-emerald-500',
                )}
              />
              {listening ? 'Ouvindo…' : (statusLabel[agentStatus] ?? 'Pronto')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAgentOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {agentMessages.length === 0 && !isBusy && (
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
            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div className={cn('flex max-w-[85%] gap-2', m.role === 'user' && 'flex-row-reverse')}>
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[#0F766E]/15 text-[#0F766E]',
                )}
              >
                {m.role === 'user' ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-sm',
                    m.role === 'user'
                      ? 'rounded-tr-sm bg-primary text-primary-foreground'
                      : 'rounded-tl-sm border border-border bg-card text-foreground',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                </div>
                {m.role === 'assistant' && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <button
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() => void handleCopy(m.id, m.content)}
                      title="Copiar mensagem"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    {ttsSupported && (
                      <button
                        className={cn(
                          'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors hover:bg-muted',
                          playingId === m.id
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => handleListen(m.id, m.content)}
                        title={playingId === m.id ? 'Parar áudio' : 'Ouvir mensagem'}
                      >
                        <Volume2
                          className={cn('h-3.5 w-3.5', playingId === m.id && 'animate-pulse')}
                        />
                        <span>{playingId === m.id ? 'Tocando' : 'Ouvir'}</span>
                      </button>
                    )}
                  </div>
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

        {isBusy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {agentStatus === 'executing'
              ? 'Executando ação no dashboard…'
              : 'Analisando seus dados…'}
          </div>
        )}

        {agentStatus === 'error' && agentError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-xs text-red-700">{agentError}</p>
                <button
                  className="mt-2 flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-200"
                  onClick={() => void retryAgent()}
                >
                  <RefreshCw className="h-3 w-3" />
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card p-3">
        {listening && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-600">Ouvindo… Fale agora</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {micSupported && (
            <Button
              variant={listening ? 'destructive' : 'outline'}
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={listening ? stopListening : startListening}
              title={listening ? 'Parar gravação' : 'Falar'}
            >
              {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
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
            disabled={!text.trim() || isBusy}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {micSupported
            ? 'Voz usa os recursos do navegador.'
            : 'Reconhecimento de voz não disponível neste navegador.'}
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
