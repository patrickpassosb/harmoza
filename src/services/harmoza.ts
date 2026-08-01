/* HARMOZA — Serviços de backend (rotas /backend/v1) */

import pb from '@/lib/pocketbase/client'
import type { Workbook } from '@/lib/harmoza'

export interface AgentResponse {
  reply: string
  action: string | null
  params: Record<string, unknown>
}

export async function askAgent(
  question: string,
  data: { sheets: unknown[]; dashboard: unknown[] },
): Promise<AgentResponse> {
  const res = await pb.send<AgentResponse>('/backend/v1/harmoza/agent', {
    method: 'POST',
    body: JSON.stringify({ question, data }),
  })
  return res
}

export async function fetchDemoWorkbook(): Promise<{ workbook: Workbook; workbookId: string }> {
  const res = await pb.send<{ workbook: Workbook; workbookId: string }>(
    '/backend/v1/harmoza/demo',
    {
      method: 'GET',
    },
  )
  return res
}

export async function listWorkbooks(): Promise<{ id: string; name: string; fileName?: string }[]> {
  const res = await pb.collection('workbooks').getList(1, 50, { sort: '-created' })
  return res.items.map((it) => ({ id: it.id, name: it.name, fileName: it.fileName }))
}

export async function saveWorkbook(workbook: Workbook): Promise<void> {
  const existing = await pb.collection('workbooks').getList(1, 1, {
    filter: pb.filter('name = {:name}', { name: workbook.name }),
  })
  const data = {
    name: workbook.name,
    fileName: workbook.fileName,
    rawJson: JSON.stringify(workbook),
  }
  if (existing.items.length > 0) {
    await pb.collection('workbooks').update(existing.items[0].id, data)
  } else {
    await pb.collection('workbooks').create(data)
  }
}
