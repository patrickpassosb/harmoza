// HARMOZA — serviços: comunicação com o backend (agente + demo)
import pb from '@/lib/pocketbase/client'
import type { AgentResult, WorkBookState } from '@/lib/harmoza'

export interface AgentRequest {
  question: string
  data?: Record<string, unknown>
}

// Chama o agente no backend (Skip Cloud hook)
export async function askAgent(
  question: string,
  data?: Record<string, unknown>,
): Promise<AgentResult> {
  try {
    const res = await pb.send('/backend/v1/harmoza/agent', {
      method: 'POST',
      body: JSON.stringify({ question, data } satisfies AgentRequest),
    })
    const result = res as Partial<AgentResult>
    return {
      reply: typeof result.reply === 'string' ? result.reply : '',
      action: typeof result.action === 'string' && result.action ? result.action : null,
      params:
        result.params && typeof result.params === 'object'
          ? (result.params as Record<string, unknown>)
          : {},
    }
  } catch (err) {
    // fallback: resposta local amigável (o app segue funcionando sem backend)
    return {
      reply: 'Não consegui falar com o agente agora. Verifique sua conexão e tente de novo.',
      action: null,
      params: {},
    }
  }
}

// Busca a planilha de demonstração (gera localmente; opcionalmente persiste no backend)
export async function fetchDemoWorkbook(): Promise<{ workbook?: WorkBookState } | null> {
  // A demo é gerada no cliente (buildDemoWorkbook) — este endpoint é um fallback
  return null
}

export async function saveWorkbookRemote(wb: WorkBookState): Promise<void> {
  try {
    await pb.collection('workbooks').create({
      name: wb.fileName,
      fileName: wb.fileName,
      rawJson: JSON.stringify(wb),
    })
  } catch {
    // persistência remota é opcional — segue local
  }
}
