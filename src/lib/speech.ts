/* HARMOZA — Voz (Web Speech API)
   Reconhecimento de fala (pt-BR) e síntese de voz. Usa recursos nativos do
   navegador (Chrome/Edge têm melhor suporte). */

export interface SpeechListenCallbacks {
  onResult: (text: string) => void
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

export function startListening(callbacks: SpeechListenCallbacks): (() => void) | null {
  if (!isSpeechSupported()) {
    callbacks.onError('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.')
    return null
  }
  const SR =
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  const recognition = new (SR as new () => SpeechRecognition)()
  recognition.lang = 'pt-BR'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const text = event.results?.[0]?.[0]?.transcript ?? ''
    if (text.trim()) callbacks.onResult(text.trim())
  }
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    callbacks.onError(event.error || 'Erro no reconhecimento de voz')
  }
  recognition.onend = () => callbacks.onEnd()
  try {
    recognition.start()
  } catch {
    callbacks.onError('Não foi possível iniciar o microfone.')
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

export function speak(text: string, onEnd?: () => void): void {
  if (!isSpeechSynthesisSupported()) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'
    utterance.rate = 1.05
    utterance.pitch = 1
    const voices = window.speechSynthesis.getVoices()
    const ptVoice = voices.find((v) => v.lang.toLowerCase().startsWith('pt'))
    if (ptVoice) utterance.voice = ptVoice
    if (onEnd) {
      utterance.onend = () => onEnd()
      utterance.onerror = () => onEnd()
    }
    window.speechSynthesis.speak(utterance)
  } catch {
    /* síntese indisponível — segue sem voz */
  }
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel()
}
