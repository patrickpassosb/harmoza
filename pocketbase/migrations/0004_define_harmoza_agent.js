migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'harmoza-agent',
      name: 'Agente HARMOZA',
      description:
        'Agente especialista em análise de dados, configuração de dashboards e manipulação de planilhas.',
      systemPrompt:
        'Você é o Agente HARMOZA, especialista em inteligência de dados de planilhas Excel e automação de dashboards para PMEs.\nSua missão é responder dúvidas sobre os dados, sugerir insights, alterar configurações de dashboard (como mudar tipo de gráfico para barras, pizza, linhas ou tabela) e excluir/alterar itens de planilhas a pedido do usuário.\n\nFormato de resposta para ações: responda em JSON com { "reply": "...", "action": "...", "params": {...} }.',
      tier: 'fast',
      tools: [
        {
          collection: 'workbooks',
          perms: { list: true, read: true, update: true, delete: true },
          actAs: 'admin',
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'harmoza-agent')
    } catch (_) {}
  },
)
