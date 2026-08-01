// HARMOZA — agente de IA (texto + voz) em painel lateral
import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Send, Volume2, X, Bot, Loader2, Sparkles } from 'lucide-react'
import type { AgentState, ChatMessage } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  messages: ChatMessage[]
  onSend: (text: string) => void
  state: AgentState
  onStopListening: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult:
    | ((e: {
        results: ArrayLike<{ 0: { transcript: string } } & { isFinal: boolean }>
        resultIndex: number
      }) => void)
    | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>
  return (
    (w.SpeechRecognition as SpeechRecognitionCtor) ||
    (w.webkitSpeechRecognition as SpeechRecognitionCtor) ||
    null
  )
}

export function AgentPanel({ open, onClose, messages, onSend, state, onStopListening }: Props) {
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const recogRef = useRef<SpeechRecognitionLike | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef('')
  transcriptRef.current = transcript

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, state])

  // Fala a última resposta do agente
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (
      last?.role === 'assistant' &&
      voiceEnabled &&
      typeof window !== 'undefined' &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(last.content)
      u.lang = 'pt-BR'
      u.rate = 1.05
      window.speechSynthesis.speak(u)
    }
  }, [messages, voiceEnabled])

  const startListening = () => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) {
      setTranscript('Seu navegador não suporta reconhecimento de voz. Use o campo de texto.')
      return
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setListening(true)
    setTranscript('')
    const rec = new Ctor()
    rec.lang = 'pt-BR'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      setTranscript(text)
    }
    rec.onend = () => {
      setListening(false)
      const t = transcriptRef.current.trim()
      if (t) {
        onSend(t)
        setTranscript('')
      }
    }
    rec.onerror = (e) => {
      setListening(false)
      if (e.error !== 'aborted') setTranscript(`Erro de reconhecimento: ${e.error}`)
    }
    rec.start()
    recogRef.current = rec
  }

  const stopListening = () => {
    onStopListening()
    recogRef.current?.stop()
    setListening(false)
  }

  const submit = () => {
    const text = input.trim()
    if (!text) return
    onSend(text)
    setInput('')
  }

  if (!open) return null

  const stateLabel: Record<AgentState, string> = {
    idle: 'Pronto para ajudar',
    listening: 'Ouvindo…',
    processing: 'Processando…',
    executing: 'Executando ação…',
    done: 'Concluído',
    error: 'Não entendi',
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-[#172554] px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Agente HARMOZA</p>
            <p className="flex items-center gap-1 text-[11px] text-white/60">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  state === 'listening'
                    ? 'animate-pulse bg-red-400'
                    : state === 'processing' || state === 'executing'
                      ? 'animate-pulse bg-amber-400'
                      : 'bg-emerald-400'
                }`}
              />
              {stateLabel[state]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setVoiceEnabled(!voiceEnabled)
              if (voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel()
            }}
            title={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}
            className={`rounded-lg p-1.5 ${voiceEnabled ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 pt-8 text-center">
            <Sparkles className="h-8 w-8 text-[#0F766E]" />
            <p className="text-sm font-medium text-[#172554]">Pergunte sobre seus dados</p>
            <p className="max-w-[260px] text-xs text-muted-foreground">
              “Qual foi o total de vendas?” · “Crie um gráfico de vendas por região” · “Qual região
              tem o melhor resultado?”
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-subtle ${
                m.role === 'user'
                  ? 'rounded-br-md bg-[#172554] text-white'
                  : 'rounded-bl-md bg-muted text-[#1e293b]'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.action && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#0F766E]">
                  <Sparkles className="h-3 w-3" /> Ação executada no dashboard
                </p>
              )}
            </div>
          </div>
        ))}
        {(state === 'processing' || state === 'executing') && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
              {state === 'executing' ? 'Executando ação…' : 'Analisando dados…'}
            </div>
          </div>
        )}
        {listening && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            {transcript || 'Ouvindo…'}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-white p-3">
        {transcript && !listening && (
          <p className="mb-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            Você disse: {transcript}
          </p>
        )}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 focus-within:border-[#0F766E]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Digite ou use o microfone…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {listening ? (
              <button
                onClick={stopListening}
                className="rounded-lg bg-red-500 p-1.5 text-white hover:bg-red-600"
                title="Parar gravação"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={startListening}
                disabled={state === 'processing' || state === 'executing'}
                className={`rounded-lg p-1.5 transition-colors ${
                  voiceEnabled
                    ? 'text-[#0F766E] hover:bg-[#0F766E]/10'
                    : 'text-muted-foreground/50 hover:bg-muted'
                } disabled:opacity-50`}
                title="Falar com o agente"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={submit}
            disabled={!input.trim() || state === 'processing' || state === 'executing'}
            className="rounded-xl bg-[#172554] p-2.5 text-white transition-colors hover:bg-[#172554]/90 disabled:opacity-40"
            title="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
