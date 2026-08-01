// harmoza_agent.js — HARMOZA
// POST /backend/v1/harmoza/agent
// Recebe { messages, dataSummary, dashboardSummary } e devolve
// { action, params, reply } via $ai.chat (JSON estruturado).
// O app EXECUTA a ação real no estado; o hook só decide o que fazer.
routerAdd(
  'POST',
  '/backend/v1/harmoza/agent',
  (e) => {
    const body = e.requestInfo().body || {}
    const messages = body.messages || []
    const dataSummary = body.dataSummary || ''
    const dashboardSummary = body.dashboardSummary || ''

    if (!Array.isArray(messages) || messages.length === 0) {
      return e.json(400, { error: 'messages é obrigatório' })
    }

    const system = [
      'Você é o agente de IA da HARMOZA, um assistente de gestão para pequenas e médias empresas que usam Excel.',
      'Você ajuda o usuário a entender os dados da planilha importada e a modificar o dashboard.',
      '',
      'CONTEXTO DOS DADOS (resumo calculado no navegador, com valores reais):',
      dataSummary || '(nenhum dado importado ainda)',
      '',
      'CONTEXTO DO DASHBOARD ATUAL:',
      dashboardSummary || '(dashboard vazio)',
      '',
      'REGRAS:',
      '- Responda SEMPRE em português (pt-BR), tom profissional e direto, sem gírias.',
      '- Responda APENAS com um JSON válido, sem texto fora, sem markdown. Formato exato:',
      '  {"action": "<acao>", "params": { ... }, "reply": "<sua resposta curta em pt-BR>"}',
      '- action deve ser UMA destas (escolha a mais adequada ao pedido):',
      '  "answer"       -> pergunta sobre os dados (responda na reply com números reais do contexto)',
      '  "add_chart"    -> criar um gráfico novo. params: {title, chartType ("bar"|"line"|"pie"|"table"|"ranking"|"kpi"), columnX, columnY?, size ("small"|"medium"|"large")}',
      '  "remove_component" -> remover um componente. params: {title} (título aproximado do componente)',
      '  "move_component"   -> mover um componente. params: {title, position ("top"|"bottom"|"left"|"right")}',
      '  "add_kpi"      -> adicionar um card KPI. params: {title, column, aggregation ("sum"|"avg"|"count"), format ("currency"|"number"|"percent"|"date")}',
      '  "create_sheet" -> criar uma nova aba. params: {name}',
      '  "filter"       -> aplicar filtro de período. params: {period ("all"|"last3"|"last6"|"last12"|"month")}',
      '- "answer" é para perguntas (ex.: "qual o total de vendas?"). Use números do contexto, NÃO invente.',
      '- Para pedidos de criar gráfico/aba/KPI ou remover/mover, escolha a action correspondente e preencha params.',
      '- Se o comando for ambíguo, use action "answer" e peça UMA única informação adicional na reply.',
      '- reply deve ser curta (máx. ~2 frases) e citar números reais quando for pergunta.',
    ].join('\n')

    let result
    try {
      result = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: system },
          ...messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: typeof m.content === 'string' ? m.content : '',
          })),
        ],
        temperature: 0.2,
      })
    } catch (err) {
      $app
        .logger()
        .error(
          'harmoza agent $ai.chat failed',
          'error',
          String(err && err.message ? err.message : err),
        )
      return e.json(502, { error: 'Não consegui processar o pedido agora. Tente novamente.' })
    }

    const content =
      result && result.choices && result.choices[0] && result.choices[0].message
        ? result.choices[0].message.content
        : ''
    if (!content) {
      return e.json(502, { error: 'Resposta vazia do modelo.' })
    }

    // Extrai o JSON (tolerando crases/markdown acidental)
    let cleaned = content.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/```$/, '')
        .trim()
    }
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end < start) {
      return e.json(200, {
        action: 'answer',
        params: {},
        reply: 'Não entendi o comando. Pode reformular?',
      })
    }
    let parsed
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1))
    } catch (_) {
      return e.json(200, {
        action: 'answer',
        params: {},
        reply: 'Não entendi o comando. Pode reformular?',
      })
    }

    const action = typeof parsed.action === 'string' ? parsed.action : 'answer'
    const params = parsed.params && typeof parsed.params === 'object' ? parsed.params : {}
    const reply = typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply : 'Pronto!'

    return e.json(200, { action, params, reply })
  },
  $apis.requireAuth(),
)
