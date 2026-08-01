routerAdd(
  'POST',
  '/backend/v1/api-tokens',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const name = String(body.name || '').trim()
    if (!name) {
      throw new BadRequestError('Dados inválidos', {
        name: new ValidationError('validation_required', 'O nome do token é obrigatório.'),
      })
    }

    const validDays = [7, 30, 90, 365, null]
    let expiresInDays = body.expiresInDays
    if (expiresInDays === null || expiresInDays === undefined || expiresInDays === '') {
      expiresInDays = null
    } else {
      expiresInDays = Number(expiresInDays)
      if (!validDays.includes(expiresInDays)) {
        throw new BadRequestError('Dados inválidos', {
          expiresInDays: new ValidationError(
            'validation_invalid_value',
            'Validade inválida. Use 7, 30, 90, 365 ou null.',
          ),
        })
      }
    }

    let expiresAt = ''
    if (expiresInDays !== null) {
      const d = new Date()
      d.setDate(d.getDate() + expiresInDays)
      expiresAt = d.toISOString()
    }

    const token = 'hmz_' + $security.randomString(48)
    const tokenHash = $security.sha256(token)

    const col = $app.findCollectionByNameOrId('api_tokens')
    const record = new Record(col, {
      owner: userId,
      name: name,
      tokenHash: tokenHash,
      revoked: false,
    })
    if (expiresAt) {
      record.set('expiresAt', expiresAt)
    }
    $app.save(record)

    return e.json(200, {
      id: record.id,
      name: name,
      expiresAt: expiresAt || null,
      token: token,
    })
  },
  $apis.requireAuth(),
)
