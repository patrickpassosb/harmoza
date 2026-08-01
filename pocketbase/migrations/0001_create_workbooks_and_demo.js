migrate(
  (app) => {
    // ------------------------------------------------------------------
    // 1) Conta de demonstração (auth collection `users`, criada pelo template)
    //    demo@harmoza.com.br / demo1234
    // ------------------------------------------------------------------
    let demo = null
    try {
      demo = app.findFirstRecordByData('users', 'email', 'demo@harmoza.com.br')
    } catch (_) {}
    if (!demo) {
      const col = app.findCollectionByNameOrId('users')
      const rec = new Record(col, {
        email: 'demo@harmoza.com.br',
        password: 'demo1234',
        passwordConfirm: 'demo1234',
        name: 'Equipe HARMOZA',
      })
      app.save(rec)
    }

    // ------------------------------------------------------------------
    // 2) Coleção `workbooks` — cada importação de planilha vira um projeto
    // ------------------------------------------------------------------
    const wb = new Collection({
      name: 'workbooks',
      type: 'base',
      listRule: "@request.auth.id != '' && owner = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
      fields: [
        {
          name: 'owner',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'fileName', type: 'text' },
        { name: 'rawJson', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(wb)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('workbooks')
      app.delete(col)
    } catch (_) {}
    try {
      const demo = app.findFirstRecordByData('users', 'email', 'demo@harmoza.com.br')
      if (demo) app.delete(demo)
    } catch (_) {}
  },
)
