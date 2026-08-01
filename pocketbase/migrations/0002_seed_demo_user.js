// 0002_seed_demo_user.js — HARMOZA
// Cria a conta de demonstração (visível no login) e uma collection base
// "ai_context" para o agente do Skip ter ferramentas/contexto.
migrate(
  (app) => {
    // ---- Usuário demo ----
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'demo@harmoza.com.br')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('demo@harmoza.com.br')
      record.setPassword('demo1234') // 8+ chars
      record.setVerified(true)
      record.set('name', 'Equipe HARMOZA')
      app.save(record)
    }

    // ---- Collection base "ai_context" (ferramenta/contexto do agente) ----
    try {
      app.findCollectionByNameOrId('ai_context')
    } catch (_) {
      const collection = new Collection({
        name: 'ai_context',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'title', type: 'text', required: false },
          { name: 'content', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      app.delete(app.findAuthRecordByEmail('_pb_users_auth_', 'demo@harmoza.com.br'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ai_context'))
    } catch (_) {}
  },
)
