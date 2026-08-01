/* HARMOZA — Agente de IA (painel lateral)
   Chat por texto + voz (Web Speech API), histórico, estados de processamento,
   e execução real de ações sobre o dashboard/abas. */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Square,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useApp } from '@/lib/AppContext'
import { askAgent } from '@/services/harmoza'
import { buildAgentContext, applyAgentAction, generateDashboard, type Sheet } from '@/lib/harmoza'
import { isSpeechSupported, startListening, speak, stopSpeaking } from '@/lib/speech'
import { cn } from '@/lib/utils'

type AgentPhase =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'processing'
  | 'executing'
  | 'done'
  | 'error'

export function AgentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp()
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<AgentPhase>('idle')
  const [phaseText, setPhaseText] = useState('')
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lastReply, setLastReply] = useState('')
  const stopListenRef = useRef<(() => void) | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sheets = state.sheets
  const activeIndex = state.activeSheetIndex

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, state.agentHistory.length, phase])

  const addMessage = useCallback(
    (role: 'user' | 'assistant', content: string) => {
      dispatch({
        type: 'ADD_AGENT_MESSAGE',
        message: { id: 'm-' + Date.now(), role, content, createdAt: Date.now() },
      })
    },
    [dispatch],
  )

  const handleListen = () => {
    if (listening) {
      stopListenRef.current?.()
      stopListenRef.current = null
      setListening(false)
      setPhase('idle')
      return
    }
    if (!isSpeechSupported()) {
      setPhase('error')
      setPhaseText('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.')
      return
    }
    setListening(true)
    setTranscript('')
    setPhase('listening')
    stopListenRef.current = startListening({
      onResult: (text) => {
        setTranscript(text)
        setInput(text)
        setPhase('transcribing')
      },
      onError: (msg) => {
        setListening(false)
        setPhase('error')
        setPhaseText(msg)
      },
      onEnd: () => {
        setListening(false)
        stopListenRef.current = null
        setPhase((p) => (p === 'listening' ? 'idle' : p))
      },
    })
  }

  const sendMessage = async (text?: string) => {
    const question = (text ?? input).trim()
    if (!question) return
    setInput('')
    setTranscript('')
    addMessage('user', question)
    setPhase('processing')
    setPhaseText('Interpretando…')
    stopSpeaking()

    try {
      // contexto para o agente
      const data = {
        sheets: sheets.map((s: Sheet) => ({
          name: s.name,
          columns: s.columns.map((c) => c.name),
          rowCount: s.rows.length,
        })),
        dashboard: state.dashboard.widgets.map((w) => ({ title: w.title, kind: w.kind })),
      }
      const res = await askAgent(question, data)
      const reply = res.reply || 'Entendi.'
      const action = res.action || null
      const params = res.params || {}

      // executa a ação real
      if (action) {
        setPhase('executing')
        setPhaseText('Executando…')
        const ctx = buildAgentContext(
          sheets,
          (s: Sheet[]) => dispatch({ type: 'SET_SHEETS', sheets: s }),
          activeIndex,
          (i: number) => dispatch({ type: 'SET_ACTIVE_SHEET', index: i }),
          state.dashboard,
          (d) => dispatch({ type: 'SET_DASHBOARD', dashboard: d }),
        )
        const result = applyAgentAction(ctx, action, params)
        const finalReply = result ? `${reply} ${result}` : reply
        addMessage('assistant', finalReply)
        setLastReply(finalReply)
        setPhase('done')
        setPhaseText('Ação concluída')
        speak(finalReply)
        // força regeração do dashboard se nova aba foi criada
        if (action === 'create_sheet') {
          const idx = ctx.sheets.length - 1
          dispatch({ type: 'SET_ACTIVE_SHEET', index: idx })
        }
        if (action === 'create_chart') {
          // gráfico criado — assegura que está no dashboard visível
          dispatch({ type: 'SET_MODE', mode: 'dashboard' })
        }
      } else {
        addMessage('assistant', reply)
        setLastReply(reply)
        setPhase('done')
        setPhaseText('Respondido')
        speak(reply)
      }
    } catch (err) {
      setPhase('error')
      setPhaseText(err instanceof Error ? err.message : 'Não consegui processar. Tente novamente.')
      addMessage(
        'assistant',
        'Desculpe, tive um problema ao processar. Tente novamente em instantes.',
      )
    }
  }

  const replayLast = () => {
    if (lastReply) speak(lastReply)
  }

  if (!open) return null

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
      {phase !== 'idle' && phase !== 'done' && (
        <div
          className={cn(
            'flex items-center gap-2 border-b px-4 py-2 text-sm',
            phase === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-primary/10 bg-primary/5 text-primary',
          )}
        >
          {phase === 'listening' && (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              Ouvindo… fale agora
            </>
          )}
          {phase === 'transcribing' && <Loader2 className="h-4 w-4 animate-spin" />}
          {phase === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
          {phase === 'executing' && <Loader2 className="h-4 w-4 animate-spin" />}
          {phase === 'error' && <AlertTriangle className="h-4 w-4" />}
          <span className="font-medium">{phaseText || phase}</span>
        </div>
      )}

      {/* Transcrição do áudio */}
      {transcript && (
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm italic text-muted-foreground">
          🎤 “{transcript}”
        </div>
      )}

      {/* Histórico */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4 harmoza-scroll">
        {state.agentHistory.length === 0 ? (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-primary/40" />
            <p className="font-medium text-foreground">Pergunte sobre seus dados</p>
            <p className="mt-1 text-xs">
              Ex.: “Qual o total de vendas?”, “Crie um gráfico de vendas por região”, “Adicione um
              indicador de ticket médio”, “Remova o gráfico de pizza”.
            </p>
          </div>
        ) : (
          state.agentHistory.map((m) => (
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
        <div ref={messagesEndRef} />
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
                sendMessage()
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
            onClick={() => sendMessage()}
            disabled={!input.trim() || phase === 'processing'}
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
              onClick={() => sendMessage('Crie um gráfico de vendas por região')}
            >
              Gráfico por região
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground"
              onClick={() => sendMessage('Adicione um indicador de ticket médio')}
            >
              + Ticket médio
            </Button>
          </div>
          {lastReply && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={replayLast}>
              <Volume2 className="h-3.5 w-3.5" /> Ouvir de novo
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
