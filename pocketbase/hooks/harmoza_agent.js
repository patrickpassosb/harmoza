// HARMOZA — Agente de IA (Global: todos os workbooks)
// POST /backend/v1/harmoza/agent
// Recebe: { messages, workbooksSummary, dashboardSummary }
// Devolve: { reply, action, params }
routerAdd(
  'POST',
  '/backend/v1/harmoza/agent',
  (e) => {
    const body = e.requestInfo().body || {}
    const messages = Array.isArray(body.messages) ? body.messages : []
    const lastUser = [...messages].reverse().find((m) => m && m.role === 'user')
    const question = (lastUser && lastUser.content ? String(lastUser.content) : '').trim()
    const workbooksSummary = String(body.workbooksSummary || '')
    const dashSummary = String(body.dashboardSummary || '')
    if (!question) return e.badRequestError('missing question')

    const system = [
      'Você é o Agente HARMOZA, plataforma especialista em transformar planilhas Excel em dashboards e gerenciar dados.',
      'Você tem acesso a TODOS os workbooks (arquivos) do usuário e pode consultar, comparar, criar, alterar e excluir dados em qualquer um deles.',
      'Responda SEMPRE em português (Brasil), com tom profissional e formatação organizada em Markdown.',
      '- Use texto em **negrito** para destacar nomes e métricas.',
      '- Use marcadores "-" para listas.',
      '',
      'CONTEXTO GLOBAL:',
      'O usuário pode ter múltiplos workbooks. Cada workbook tem um nome, nome de arquivo (fileName) e múltiplas abas (sheets).',
      'Você recebe o resumo de TODOS os workbooks do usuário. Use essas informações para identificar o arquivo correto.',
      '',
      'REGRA DE AMBIGUIDADE:',
      'Se o usuário pede para modificar dados mas não especifica claramente qual workbook/arquivo, e há mais de um workbook disponível,',
      'você DEVE perguntar qual arquivo ele deseja usar antes de executar qualquer ação. NÃO execute a ação até que o arquivo seja confirmado.',
      '',
      'AÇÕES SUPORTADAS (Responda em JSON strictly válido com as chaves "reply", "action" e "params"):',
      '1. Alterar tipo de gráfico:',
      '   { "reply": "...", "action": "update_chart", "params": { "workbook": "nome do arquivo", "title": "título do gráfico", "kind": "bar" } }',
      '   Tipos: "bar", "line", "pie", "ranking", "table". O campo "workbook" é opcional (usa o ativo se omitido).',
      '2. Excluir item/linha da planilha:',
      '   { "reply": "...", "action": "delete_item", "params": { "workbook": "nome do arquivo", "sheetName": "nome da aba", "item": "valor" } }',
      '3. Criar gráfico:',
      '   { "reply": "...", "action": "add_chart", "params": { "workbook": "nome do arquivo", "title": "...", "kind": "bar|line|pie|ranking|table" } }',
      '4. Remover gráfico:',
      '   { "reply": "...", "action": "remove_chart", "params": { "workbook": "nome do arquivo", "title": "..." } }',
      '5. Adicionar KPI:',
      '   { "reply": "...", "action": "add_kpi", "params": { "workbook": "nome do arquivo", "title": "...", "value": "..." } }',
      '6. Criar nova aba:',
      '   { "reply": "...", "action": "create_sheet", "params": { "workbook": "nome do arquivo", "name": "..." } }',
      '7. Comparar dados entre arquivos (use "action": "answer" e faça a comparação na resposta):',
      '   Compare os dados dos workbooks diretamente na resposta usando Markdown.',
      '8. Consultas genéricas:',
      '   { "reply": "sua resposta em Markdown", "action": "answer", "params": {} }',
      '',
      '9. Editar filtro de componente:',
      '   { "reply": "...", "action": "edit_filter", "params": { "workbook": "nome do arquivo", "title": "título do gráfico", "filterAction": "add|replace|remove", "field": "nome do campo", "op": "eq|neq|contains|gt|lt|gte|lte", "value": "valor" } }',
      '   - filterAction "add": adiciona um filtro aos existentes',
      '   - filterAction "replace": substitui todos os filtros por este novo',
      '   - filterAction "remove": remove filtros (se field especificado, remove apenas desse campo; se não, remove todos)',
      '   - Operadores: "eq" (igual a), "neq" (diferente de), "contains" (contém), "gt" (maior que), "lt" (menor que), "gte" (maior ou igual), "lte" (menor ou igual)',
      '   - Use os nomes exatos das colunas disponíveis no resumo dos workbooks',
      '10. Editar eixo do componente:',
      '   { "reply": "...", "action": "edit_axis", "params": { "workbook": "nome do arquivo", "title": "título do gráfico", "dimension": "nome do campo (eixo X)", "metric": "nome do campo (eixo Y)" } }',
      '   - Altera a dimensão (eixo X) e/ou a métrica (eixo Y) do componente',
      '   - Use os nomes exatos das colunas disponíveis no resumo dos workbooks',
      '   - Se apenas um dos eixos for especificado, mantenha o outro inalterado',
      '   - Não aplicável a indicadores (KPIs)',
      '',
      'ATENÇÃO:',
      '- O campo "workbook" em "params" deve conter o nome ou fileName do arquivo alvo.',
      '- Se o usuário não especificar o workbook e houver apenas um, use-o automaticamente.',
      '- Se houver múltiplos e o usuário não especificar, PERGUNTE qual arquivo usar.',
      '- NUNCA invente números: use os dados fornecidos no resumo.',
      '- Para comparações entre arquivos, analise os dados de cada workbook e apresente a comparação.',
      '- Para editar filtro ou eixo, SEMPRE use nomes de campos que existem no resumo dos workbooks.',
      '- Se o usuário pedir para filtrar ou plotar um campo inexistente, explique quais campos estão disponíveis.',
      '- Se o usuário não especificar o componente por nome, e houver múltiplos componentes, PERGUNTE qual componente ele deseja editar.',
    ].join('\n')

    const user = [
      'Histórico recente:',
      JSON.stringify(messages.slice(-6)),
      '',
      'Workbooks do usuário (TODOS os arquivos):',
      workbooksSummary || '- nenhum dado',
      '',
      'Dashboard atual (workbook ativo):',
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
