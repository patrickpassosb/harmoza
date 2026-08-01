/* HARMOZA — Voz (Web Speech API)
   Reconhecimento de fala (pt-BR) e síntese de voz. Usa recursos nativos do
   navegador (Chrome/Edge têm melhor suporte). */

export interface SpeechListenCallbacks {
  onResult: (text: string, isFinal: boolean) => void
  onError: (message: string) => void
  onEnd: () => void
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  )
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function getRecognitionErrorMessage(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'O navegador bloqueou o acesso ao microfone. Permite o acesso ao microfone ou desativa recursos de privacidade (ex: Shields do Brave) para esta página.'
    case 'audio-capture':
      return 'Nenhum microfone encontrado. Verifica se um microfone está ligado ao dispositivo.'
    case 'network':
      return 'Erro de rede no reconhecimento de voz. Verifica a tua ligação à internet.'
    case 'no-speech':
      return 'Nenhuma fala detectada. Tenta novamente e fala mais perto do microfone.'
    case 'aborted':
      return ''
    default:
      return `Erro no reconhecimento de voz: ${error}`
  }
}

export function startListening(
  callbacks: SpeechListenCallbacks,
  options?: { interim?: boolean },
): (() => void) | null {
  if (!isSpeechSupported()) {
    callbacks.onError('O teu navegador não suporta reconhecimento de voz. Usa Chrome ou Edge.')
    return null
  }
  const SR =
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  const recognition = new (SR as new () => SpeechRecognition)()
  recognition.lang = 'pt-BR'
  recognition.interimResults = options?.interim ?? false
  recognition.maxAlternatives = 1

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let finalText = ''
    let interimText = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) finalText += result[0].transcript
      else interimText += result[0].transcript
    }
    if (finalText.trim()) callbacks.onResult(finalText.trim(), true)
    if (interimText.trim()) callbacks.onResult(interimText.trim(), false)
  }

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    const msg = getRecognitionErrorMessage(event.error || 'unknown')
    if (msg) callbacks.onError(msg)
  }

  recognition.onend = () => callbacks.onEnd()

  try {
    recognition.start()
  } catch {
    callbacks.onError('Não foi possível iniciar o microfone. Verifica as permissões do navegador.')
    return null
  }

  return () => {
    try {
      recognition.stop()
    } catch {
      /* já parado */
    }
  }
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve([])
      return
    }
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.speechSynthesis.removeEventListener('voiceschanged', finish)
      clearTimeout(timer)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', finish)
    const timer = setTimeout(finish, 2000)
  })
}

export function hasVoices(): boolean {
  return isSpeechSynthesisSupported() && window.speechSynthesis.getVoices().length > 0
}

export function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
}

export function speak(text: string, onEnd?: () => void, onError?: (msg: string) => void): void {
  if (!isSpeechSynthesisSupported()) {
    onError?.('Síntese de voz não suportada neste navegador.')
    onEnd?.()
    return
  }
  try {
    window.speechSynthesis.cancel()
    const cleanText = stripMarkdown(text)
    const voices = window.speechSynthesis.getVoices()
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'pt-BR'
    utterance.rate = 1.05
    utterance.pitch = 1
    const ptVoice = voices.find((v) => v.lang.toLowerCase().startsWith('pt'))
    if (ptVoice) utterance.voice = ptVoice

    let settled = false
    const settle = (isError: boolean, msg?: string) => {
      if (settled) return
      settled = true
      if (isError) onError?.(msg || 'Erro na síntese de voz')
      onEnd?.()
    }

    utterance.onend = () => settle(false)
    utterance.onerror = (event) => {
      const errType = event.error || ''
      if (errType === 'canceled' || errType === 'interrupted') {
        settle(false)
      } else {
        settle(true, errType || 'Erro na síntese de voz')
      }
    }

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    onError?.(err instanceof Error ? err.message : 'Falha na síntese de voz')
    onEnd?.()
  }
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel()
}
