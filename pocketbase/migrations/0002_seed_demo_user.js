// 0002_seed_demo_user.js — HARMOZA
// Garante a conta de demonstração (visível no login) e a collection base
// "ai_context" (contexto/ferramenta do agente do Skip).
migrate(
  (app) => {
    // ---- Usuário demo (idempotente) ----
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let demo = null
    try {
      demo = app.findAuthRecordByEmail('_pb_users_auth_', 'demo@harmoza.com.br')
    } catch (_) {}
    if (!demo) {
      const record = new Record(users)
      record.setEmail('demo@harmoza.com.br')
      record.setPassword('demo1234') // 8+ chars
      record.setVerified(true)
      record.set('name', 'Equipe HARMOZA')
      app.save(record)
    }

    // ---- Collection "ai_context" (idempotente) ----
    let aiCol = null
    try {
      aiCol = app.findCollectionByNameOrId('ai_context')
    } catch (_) {}
    if (!aiCol) {
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
