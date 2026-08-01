// HARMOZA — Agente de IA
// POST /backend/v1/harmoza/agent
// Recebe: { messages, dataSummary, dashboardSummary }
// Devolve: { reply, action, params }
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
      'Você é o Agente HARMOZA, plataforma especialista em transformar planilhas Excel em dashboards e gerenciar dados.',
      'Você tem permissões completas para consultar dados, alterar o layout e tipos dos gráficos no dashboard e remover itens da planilha.',
      'Responda SEMPRE em português (Brasil), com tom profissional e formatação organizada em Markdown.',
      'Sempre use sintaxe Markdown para estruturar suas respostas:',
      '- Use texto em **negrito** para destacar nomes e métricas.',
      '- Use marcadores "-" para listas.',
      '',
      'AÇÕES SUPORTADAS (Responda em JSON strictly válido com as chaves "reply", "action" e "params"):',
      '1. Alterar tipo de gráfico (ex: "Mude o gráfico de vendas para barras"):',
      '   { "reply": "Com certeza! Alterando o gráfico para barras.", "action": "update_chart", "params": { "title": "vendas", "kind": "bar" } }',
      '   Tipos suportados em "kind": "bar", "line", "pie", "ranking", "table".',
      '2. Excluir item/linha da planilha (ex: "Apagar o item X da planilha Y"):',
      '   { "reply": "Entendido! Processando a remoção do item X da planilha.", "action": "delete_item", "params": { "sheetName": "Y", "item": "X" } }',
      '3. Criar gráfico:',
      '   { "reply": "Criando gráfico...", "action": "add_chart", "params": { "title": "...", "kind": "bar|line|pie|ranking|table" } }',
      '4. Remover gráfico/componente:',
      '   { "reply": "Removendo...", "action": "remove_component", "params": { "title": "..." } }',
      '5. Adicionar KPI:',
      '   { "reply": "Adicionando indicador...", "action": "add_kpi", "params": { "title": "...", "value": "..." } }',
      '6. Criar nova aba:',
      '   { "reply": "Criando aba...", "action": "create_sheet", "params": { "name": "..." } }',
      '7. Dúvidas ou consultas genéricas sem modificação:',
      '   { "reply": "sua resposta explicativa em Markdown", "action": "answer", "params": {} }',
      '',
      'ATENÇÃO: Se a mensagem do usuário pedir para MUDAR um gráfico existente (ex: "mude para barras", "altere para pizza"), use a ação "update_chart".',
      'Se pedir para APAGAR ou REMOVER um registro ou produto da planilha, use "delete_item".',
      'NUNCA invente números: use os dados fornecidos no resumo.',
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
      let replyText = ''
      try {
        const res = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.1,
        })
        replyText =
          (res.choices &&
            res.choices[0] &&
            res.choices[0].message &&
            res.choices[0].message.content) ||
          ''
      } catch (_) {}

      let parsed = null
      try {
        const jsonMatch = replyText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          parsed = JSON.parse(replyText)
        }
      } catch (_) {
        parsed = { reply: replyText, action: 'answer', params: {} }
      }

      return e.json(200, {
        reply: parsed.reply || replyText || 'Processado com sucesso.',
        action: parsed.action || 'answer',
        params: parsed.params || {},
      })
    } catch (err) {
      return e.json(200, {
        reply: 'Não foi possível processar o comando.',
        action: 'answer',
        params: {},
        error: String(err && err.message ? err.message : err),
      })
    }
  },
  $apis.requireAuth(),
)
