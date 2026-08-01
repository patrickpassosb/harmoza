import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot,
  User,
  Mic,
  MicOff,
  Square,
  Send,
  Loader2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  AlertCircle,
  RefreshCw,
  Trash2,
  Sparkles,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useHarmoza } from '@/lib/store'
import {
  speak as speakTTS,
  stopSpeaking,
  startListening as startSpeechListening,
  loadVoices,
  isSpeechSynthesisSupported,
  isSpeechSupported,
} from '@/lib/speech'
import { MarkdownContent } from '@/components/MarkdownContent'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  { label: 'Visão geral de vendas', prompt: 'Qual foi o total de vendas e a melhor região?' },
  { label: 'Mudar gráfico para barras', prompt: 'Mude o gráfico de vendas para barras' },
  { label: 'Apagar item da planilha', prompt: 'Apagar o item Plano Starter da planilha' },
  { label: 'Nova aba para resumo', prompt: 'Crie uma nova aba chamada Resumo Executivo' },
]

export function AgentWorkspace() {
  const {
    workbook,
    workbooks,
    activeSheet,
    agentTargetWorkbookId,
    agentMessages,
    agentStatus,
    agentError,
    sendAgentText,
    retryAgent,
    clearAgent,
  } = useHarmoza()

  const indicatorWorkbook = agentTargetWorkbookId
    ? (workbooks.find((w) => w.id === agentTargetWorkbookId) ?? workbook)
    : workbook
  const indicatorSheet = indicatorWorkbook
    ? (indicatorWorkbook.sheets.find((s) => s.id === indicatorWorkbook.activeSheetId) ??
      indicatorWorkbook.sheets[0] ??
      null)
    : null

  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voicesReady, setVoicesReady] = useState(false)
  const [voicesAvailable, setVoicesAvailable] = useState(false)

  const stopFnRef = useRef<(() => void) | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const ttsSupported = isSpeechSynthesisSupported()
  const micSupported = isSpeechSupported()
  const ttsDisabled = !ttsSupported || (voicesReady && !voicesAvailable)

  useEffect(() => {
    loadVoices().then((voices) => {
      setVoicesReady(true)
      setVoicesAvailable(voices.length > 0)
    })
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [agentMessages, interim, agentStatus, agentError, voiceError])

  useEffect(() => {
    return () => {
      stopFnRef.current?.()
      stopSpeaking()
    }
  }, [])

  const stopListening = useCallback(() => {
    stopFnRef.current?.()
    stopFnRef.current = null
    setListening(false)
    setInterim('')
  }, [])

  const startListening = useCallback(() => {
    setVoiceError(null)
    const stopFn = startSpeechListening(
      {
        onResult: (resultText, isFinal) => {
          if (isFinal) {
            setText((t) => (t ? t + ' ' + resultText : resultText))
            setInterim('')
          } else {
            setInterim(resultText)
          }
        },
        onError: (msg) => {
          setVoiceError(msg)
          setListening(false)
          setInterim('')
          stopFnRef.current = null
        },
        onEnd: () => {
          setListening(false)
          setInterim('')
          stopFnRef.current = null
        },
      },
      { interim: true },
    )
    if (stopFn) {
      stopFnRef.current = stopFn
      setListening(true)
    }
  }, [])

  const send = useCallback(
    async (value?: string) => {
      const msg = (value ?? text).trim()
      if (!msg || agentStatus === 'processing' || agentStatus === 'executing') return
      setText('')
      setVoiceError(null)
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
      /* ignore */
    }
  }, [])

  const handleListen = useCallback(
    async (id: string, content: string) => {
      setVoiceError(null)
      if (playingId === id) {
        stopSpeaking()
        setPlayingId(null)
        return
      }
      if (!ttsSupported) {
        setVoiceError('Síntese de voz não suportada neste navegador.')
        return
      }
      let voices = window.speechSynthesis?.getVoices() ?? []
      if (!voicesReady || voices.length === 0) {
        voices = await loadVoices()
        setVoicesReady(true)
        setVoicesAvailable(voices.length > 0)
      }
      if (voices.length === 0) {
        setVoiceError('Nenhuma voz disponível neste navegador.')
        return
      }
      stopSpeaking()
      setPlayingId(id)
      speakTTS(
        content,
        () => setPlayingId(null),
        (msg) => {
          setVoiceError(`Falha na síntese de voz: ${msg}`)
          setPlayingId(null)
        },
      )
    },
    [playingId, ttsSupported, voicesReady],
  )

  const statusLabel: Record<string, string> = {
    idle: 'Pronto para ajudar',
    listening: 'Ouvindo comando…',
    processing: 'Analisando planilha…',
    executing: 'Atualizando dados e dashboard…',
    done: 'Comando concluído',
    error: 'Ocorreu um erro',
  }

  const isBusy = agentStatus === 'processing' || agentStatus === 'executing'

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Workspace Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Agente HARMOZA</h1>
              <Badge
                variant="secondary"
                className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                IA Conectada
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {listening ? 'Ouvindo seu comando por voz…' : (statusLabel[agentStatus] ?? 'Pronto')}
            </p>
          </div>
        </div>

        {indicatorWorkbook && (
          <div className="hidden items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-1.5 sm:flex dark:border-amber-700 dark:bg-amber-950/40">
            <FileSpreadsheet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div className="text-left text-xs">
              <p className="font-semibold text-amber-900 dark:text-amber-100 truncate max-w-[180px]">
                {indicatorWorkbook.fileName}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                {indicatorSheet?.name || 'Aba ativa'}
              </p>
            </div>
          </div>
        )}

        {agentMessages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAgent}
            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar conversa
          </Button>
        )}
      </div>

      {/* Main Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {agentMessages.length === 0 && !isBusy && (
          <div className="mx-auto max-w-2xl text-center py-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-4">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Como posso ajudar você hoje?</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Sou seu assistente de inteligência de dados. Posso analisar suas planilhas, alterar
              tipos de gráficos, adicionar métricas e gerenciar seus registros.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => void send(qp.prompt)}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <span className="text-xs font-semibold text-primary">{qp.label}</span>
                  <span className="mt-1 text-sm text-foreground/80 group-hover:text-foreground">
                    "{qp.prompt}"
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {agentMessages.map((m) => (
          <div
            key={m.id}
            className={cn('flex w-full', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'flex max-w-[85%] md:max-w-[75%] gap-3',
                m.role === 'user' && 'flex-row-reverse',
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-medium shadow-sm',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[#172554] text-white',
                )}
              >
                {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className="min-w-0">
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm shadow-sm',
                    m.role === 'user'
                      ? 'rounded-tr-sm bg-primary text-primary-foreground'
                      : 'rounded-tl-sm border border-border bg-card text-foreground',
                  )}
                >
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                  ) : (
                    <div>
                      <MarkdownContent content={m.content} />
                      {m.action && m.action !== 'answer' && (
                        <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                          <span>Ação executada na plataforma</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {m.role === 'assistant' && (
                  <div className="mt-1.5 flex items-center gap-2 px-1">
                    <button
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() => void handleCopy(m.id, m.content)}
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-medium">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    <button
                      className={cn(
                        'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
                        ttsDisabled
                          ? 'cursor-not-allowed opacity-40'
                          : playingId === m.id
                            ? 'text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      onClick={() => void handleListen(m.id, m.content)}
                      disabled={ttsDisabled}
                    >
                      {ttsDisabled ? (
                        <VolumeX className="h-3.5 w-3.5" />
                      ) : (
                        <Volume2
                          className={cn('h-3.5 w-3.5', playingId === m.id && 'animate-pulse')}
                        />
                      )}
                      <span>{playingId === m.id ? 'Tocando...' : 'Ouvir'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {interim && (
          <div className="flex justify-end">
            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-muted-foreground italic">
              {interim}…
            </div>
          </div>
        )}

        {isBusy && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {agentStatus === 'executing'
              ? 'Atualizando registros e configurando dashboard…'
              : 'Analisando planilhas…'}
          </div>
        )}

        {voiceError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="flex-1">
                <p className="text-xs text-amber-800 dark:text-amber-200">{voiceError}</p>
                <button
                  className="mt-1 text-[11px] font-semibold text-amber-600 hover:underline"
                  onClick={() => setVoiceError(null)}
                >
                  Dispensar
                </button>
              </div>
            </div>
          </div>
        )}

        {agentStatus === 'error' && agentError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-xs text-red-800 dark:text-red-200">{agentError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-1.5 text-xs text-red-700 dark:text-red-300 border-red-200"
                  onClick={() => void retryAgent()}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="border-t border-border bg-card p-4 md:px-8">
        {listening && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Microfone ativado. Fale seu comando agora…
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant={listening ? 'destructive' : 'outline'}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            onClick={listening ? stopListening : startListening}
            disabled={!micSupported}
            title={listening ? 'Parar gravação' : 'Falar comando'}
          >
            {listening ? (
              <Square className="h-4 w-4" />
            ) : micSupported ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
          </Button>

          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void send()}
            placeholder={
              listening
                ? 'Ouvindo sua voz…'
                : 'Pergunte sobre seus dados, peça para mudar gráficos ou apagar itens…'
            }
            className="h-11 rounded-xl text-sm"
          />

          <Button
            className="h-11 w-11 shrink-0 rounded-xl"
            size="icon"
            onClick={() => void send()}
            disabled={!text.trim() || isBusy}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          O Agente HARMOZA pode consultar suas planilhas, atualizar o dashboard em tempo real e
          remover itens.
        </p>
      </div>
    </div>
  )
}
