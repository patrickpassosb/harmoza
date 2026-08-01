routerAdd(
  'DELETE',
  '/backend/v1/api-tokens/{id}',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const tokenId = e.request.pathValue('id')
    if (!tokenId) return e.badRequestError('token id is required')

    let record = null
    try {
      record = $app.findRecordById('api_tokens', tokenId)
    } catch (_) {}
    if (!record) return e.notFoundError('token not found')

    if (record.getString('owner') !== userId) {
      return e.forbiddenError('you can only revoke your own tokens')
    }

    record.set('revoked', true)
    $app.save(record)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
