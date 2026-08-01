routerAdd(
  'GET',
  '/backend/v1/api-tokens',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const records = $app.findRecordsByFilter(
      'api_tokens',
      'owner = {:owner} && revoked != true',
      '-created',
      100,
      0,
      { owner: userId },
    )

    const now = Date.now()
    const active = records.filter(function (r) {
      const exp = r.getString('expiresAt')
      if (!exp) return true
      return new Date(exp).getTime() > now
    })

    return e.json(
      200,
      active.map(function (r) {
        const exp = r.getString('expiresAt')
        return {
          id: r.id,
          name: r.getString('name'),
          createdAt: r.getString('created'),
          expiresAt: exp || null,
        }
      }),
    )
  },
  $apis.requireAuth(),
)
