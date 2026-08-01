// HARMOZA — Agente de IA
// POST /backend/v1/harmoza/agent
// Recebe: { messages, dataSummary, dashboardSummary } (AppShell)
// Devolve: { reply, action, params } — ações compatíveis com AppShell:
//   add_chart | remove_component | move_component | add_kpi | create_sheet | filter | answer
routerAdd(
  'POST',
  '/backend/v1/harmoza/agent',
  (e) => {
    const body = e.requestInfo().body || {}
    const messages = Array.isArray(body.messages) ? body.messages : []
    const lastUser = [...messages].reverse().find((m) => m && m.role === 'user')
    const question = (lastUser && lastUser.content ? String(lastUser.content) : '').trim()
    const dataSummary = String(body.dataSummary || '')
    const dashSummary = String(body.dashboardSummary || '')
    if (!question) return e.badRequestError('missing question')

    const system = [
      'Você é o agente da HARMOZA, plataforma que transforma planilhas Excel de PMEs em dashboards inteligentes.',
      'Você recebe um resumo dos dados da planilha e do dashboard atual do usuário.',
      'Responda SEMPRE em português (Brasil), com tom profissional e respostas organizadas e fáceis de ler.',
      'Sempre use sintaxe Markdown para estruturar suas respostas:',
      '- Use texto em **negrito** para destacar palavras-chave, categorias e nomes de métricas.',
      '- Use marcadores com "-" para listas de itens, componentes ou sugestões.',
      '- Mantenha espaçamento adequado entre parágrafos.',
      '- Ao saudar ou sugerir melhorias no dashboard, categorize as opções claramente. Por exemplo:',
      '  Por favor, informe qual componente você gostaria de adicionar ou ajustar:',
      '  - **Gráficos** (Barras, Linhas, etc.)',
      '  - **KPIs** (Métricas de desempenho)',
      '  - **Filtros** (Segmentação de dados)',
      'Se o usuário pedir uma AÇÃO, responda SOMENTE com JSON: { "reply": "resposta estruturada em Markdown", "action": "tipo", "params": {...} }.',
      'Ações válidas e seus params:',
      '- add_chart: { "title", "chartType": "bar|line|pie|area|ranking|table", "columnX", "columnY", "size": "small|medium|large" }',
      '- remove_component: { "title" }',
      '- move_component: { "title", "position": "top|bottom" }',
      '- add_kpi: { "title", "column", "aggregation": "sum|avg|count", "format": "currency|number" }',
      '- create_sheet: { "name" }',
      '- filter: {} (filtro de período)',
      '- answer: {} (apenas resposta estruturada em Markdown, sem ação)',
      'Para PERGUNTAS sobre os dados ou saudações, responda { "reply": "...", "action": "answer", "params": {} }.',
      'NUNCA invente números: use apenas os dados fornecidos no resumo.',
      'Se o pedido for ambíguo, peça UMA única informação adicional de forma clara em Markdown.',
    ].join('\n')

    const user = [
      'Histórico recente:',
      JSON.stringify(messages.slice(-6)),
      '',
      'Resumo dos dados da planilha:',
      dataSummary || '- nenhum dado',
      '',
      'Dashboard atual:',
      dashSummary || '- vazio',
    ].join('\n')

    try {
      const res = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
      })
      const raw =
        (res.choices &&
          res.choices[0] &&
          res.choices[0].message &&
          res.choices[0].message.content) ||
        ''
      let parsed = null
      try {
        parsed = JSON.parse(raw)
      } catch (_) {
        parsed = { reply: raw, action: 'answer', params: {} }
      }
      const action = parsed.action || 'answer'
      return e.json(200, {
        reply: parsed.reply || raw,
        action,
        params: parsed.params || {},
      })
    } catch (err) {
      return e.json(200, {
        reply: 'Desculpe, não consegui processar agora. Tente de novo em instantes.',
        action: 'answer',
        params: {},
        error: err && err.message ? String(err.message) : 'unknown',
      })
    }
  },
  $apis.requireAuth(),
)
