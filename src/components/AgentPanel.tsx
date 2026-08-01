// HARMOZA — Agente de IA (painel lateral)
// Interface compatível com AppShell: open/onClose/messages/onSend/state/onStopListening.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Send, Volume2, X, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { isSpeechSupported, startListening, speak, stopSpeaking } from '@/lib/speech'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  messages: ChatMessage[]
  onSend: (text: string) => void
  state: 'idle' | 'listening' | 'processing' | 'executing' | 'done' | 'error'
  onStopListening: () => void
}

const PHASE_LABEL: Record<string, string> = {
  idle: 'Pronto',
  listening: 'Ouvindo…',
  processing: 'Interpretando…',
  executing: 'Executando…',
  done: 'Concluído',
  error: 'Ocorreu um erro',
}

export function AgentPanel({ open, onClose, messages, onSend, state, onStopListening }: Props) {
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const stopListenRef = useRef<(() => void) | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [open, messages.length, state])

  const handleListen = () => {
    if (listening) {
      stopListenRef.current?.()
      stopListenRef.current = null
      setListening(false)
      onStopListening()
      return
    }
    if (!isSpeechSupported()) return
    setListening(true)
    setTranscript('')
    stopListenRef.current = startListening({
      onResult: (text) => {
        setTranscript(text)
        setInput(text)
        setListening(false)
        onSend(text)
      },
      onError: () => {
        setListening(false)
      },
      onEnd: () => {
        setListening(false)
        stopListenRef.current = null
      },
    })
  }

  const send = () => {
    const text = input.trim()
    if (!text || state === 'processing' || state === 'executing') return
    setInput('')
    setTranscript('')
    onSend(text)
  }

  if (!open) return null

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
        <Sparkles className="h-5 w-5 text-[#D97706]" />
        <div className="flex-1">
          <div className="text-sm font-bold">Agente HARMOZA</div>
          <div className="text-[11px] text-primary-foreground/70">
            Assistente de dados · voz e texto
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-primary-foreground hover:bg-primary/80"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Fase ativa */}
      {state !== 'idle' && state !== 'done' && (
        <div
          className={cn(
            'flex items-center gap-2 border-b px-4 py-2 text-sm',
            state === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-primary/10 bg-primary/5 text-primary',
          )}
        >
          {state === 'listening' && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
          )}
          {(state === 'processing' || state === 'executing') && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {state === 'error' && <AlertTriangle className="h-4 w-4" />}
          <span className="font-medium">{PHASE_LABEL[state] ?? state}</span>
        </div>
      )}

      {/* Transcrição */}
      {transcript && (
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm italic text-muted-foreground">
          🎤 “{transcript}”
        </div>
      )}

      {/* Histórico */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4 harmoza-scroll">
        {messages.length === 0 ? (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-primary/40" />
            <p className="font-medium text-foreground">Pergunte sobre seus dados</p>
            <p className="mt-1 text-xs">
              Ex.: “Qual o total de vendas?”, “Crie um gráfico de vendas por região”, “Adicione um
              indicador de ticket médio”, “Remova o gráfico de pizza”.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm border border-border bg-card text-foreground',
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite um comando…"
            className="min-h-[44px] max-h-28 flex-1 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button
            variant={listening ? 'destructive' : 'default'}
            size="icon"
            onClick={handleListen}
            className={cn('h-11 w-11 shrink-0', listening && 'animate-pulse')}
            title={listening ? 'Parar gravação' : 'Falar'}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={send}
            disabled={!input.trim() || state === 'processing'}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground"
              onClick={() => onSend('Crie um gráfico de vendas por região')}
            >
              Gráfico por região
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground"
              onClick={() => onSend('Adicione um indicador de ticket médio')}
            >
              + Ticket médio
            </Button>
          </div>
          {lastAssistant && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => {
                stopSpeaking()
                speak(lastAssistant.content)
              }}
            >
              <Volume2 className="h-3.5 w-3.5" /> Ouvir de novo
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
