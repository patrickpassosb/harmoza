import { useState } from 'react'
import { Copy, Check, Code2, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export function ApiDocs() {
  const [copiedJson, setCopiedJson] = useState(false)
  const [copiedCurl, setCopiedCurl] = useState(false)
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL

  const jsonExample = JSON.stringify(
    {
      name: 'Vendas - Bling',
      source: 'bling',
      sheets: [
        {
          name: 'Pedidos',
          columns: [
            { name: 'data', type: 'date' },
            { name: 'produto', type: 'text' },
            { name: 'receita', type: 'currency' },
          ],
          rows: [{ data: '2025-01-15', produto: 'Notebook', receita: 3299 }],
        },
      ],
    },
    null,
    2,
  )

  const curlExample = `curl -X POST ${baseUrl}/backend/v1/import \\
  -H "Authorization: Bearer <SEU_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
    name: 'Vendas - Bling',
    source: 'bling',
    sheets: [
      {
        name: 'Pedidos',
        columns: [
          { name: 'data', type: 'date' },
          { name: 'produto', type: 'text' },
          { name: 'receita', type: 'currency' },
        ],
        rows: [{ data: '2025-01-15', produto: 'Notebook', receita: 3299 }],
      },
    ],
  })}'`

  const copyJson = () => {
    navigator.clipboard.writeText(jsonExample)
    setCopiedJson(true)
    toast.success('JSON copiado!')
    setTimeout(() => setCopiedJson(false), 2000)
  }

  const copyCurl = () => {
    navigator.clipboard.writeText(curlExample)
    setCopiedCurl(true)
    toast.success('curl copiado!')
    setTimeout(() => setCopiedCurl(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[#172554]">Documentação da API</h3>
        <p className="text-xs text-muted-foreground">
          Integre seu ERP enviando dados diretamente para a HARMOZA via REST.
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#172554]">Endpoint</p>
            <code className="block rounded-lg bg-muted px-3 py-2 text-xs font-mono text-[#172554]">
              POST {baseUrl}/backend/v1/import
            </code>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#172554]">Headers obrigatórios</p>
            <code className="block rounded-lg bg-muted px-3 py-2 text-xs font-mono text-[#172554]">
              Authorization: Bearer {'<token>'}
              {'\n'}
              Content-Type: application/json
            </code>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#172554]">
                <Code2 className="h-3.5 w-3.5" /> Exemplo de payload JSON
              </p>
              <Button variant="ghost" size="sm" onClick={copyJson} className="h-7 px-2 text-xs">
                {copiedJson ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copiar
              </Button>
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-[#172554] p-3 text-xs font-mono text-emerald-300">
              {jsonExample}
            </pre>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#172554]">
                <Terminal className="h-3.5 w-3.5" /> Exemplo curl
              </p>
              <Button variant="ghost" size="sm" onClick={copyCurl} className="h-7 px-2 text-xs">
                {copiedCurl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copiar
              </Button>
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-[#172554] p-3 text-xs font-mono text-cyan-300">
              {curlExample}
            </pre>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-[#172554]">Limites e comportamento</p>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li>• Máximo de 10.000 linhas por aba</li>
              <li>• Máximo de 5 MB por requisição</li>
              <li>• Múltiplas abas aceitas em um único POST</li>
              <li>
                • Reenviar com o mesmo <code className="font-mono">source</code> substitui todos os
                dados anteriores
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
