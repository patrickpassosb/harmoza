migrate(
  (app) => {
    const wbCol = app.findCollectionByNameOrId('workbooks')
    if (!wbCol.fields.getByName('source')) {
      wbCol.fields.add(new TextField({ name: 'source' }))
    }
    wbCol.addIndex('idx_workbooks_owner_source', true, 'owner, source', '')
    app.save(wbCol)

    let tokenCol = null
    try {
      tokenCol = app.findCollectionByNameOrId('api_tokens')
    } catch (_) {}
    if (!tokenCol) {
      const collection = new Collection({
        name: 'api_tokens',
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
          { name: 'tokenHash', type: 'text', required: true, hidden: true },
          { name: 'expiresAt', type: 'date', required: false },
          { name: 'revoked', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_api_tokens_owner ON api_tokens (owner)',
          'CREATE INDEX idx_api_tokens_hash ON api_tokens (tokenHash)',
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const wbCol = app.findCollectionByNameOrId('workbooks')
      wbCol.removeIndex('idx_workbooks_owner_source')
      const sf = wbCol.fields.getByName('source')
      if (sf) wbCol.fields.remove(sf)
      app.save(wbCol)
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('api_tokens'))
    } catch (_) {}
  },
)
