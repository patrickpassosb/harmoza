routerAdd(
  'POST',
  '/backend/v1/api-tokens/test',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const token = String(body.token || '').trim()
    if (!token) {
      throw new BadRequestError('Dados inválidos', {
        token: new ValidationError('validation_required', 'O token é obrigatório.'),
      })
    }

    const tokenHash = $security.sha256(token)

    let record = null
    try {
      record = $app.findFirstRecordByFilter('api_tokens', 'tokenHash = {:hash}', {
        hash: tokenHash,
      })
    } catch (_) {}

    if (!record) {
      return e.json(200, { valid: false, message: 'Token não encontrado.' })
    }
    if (record.getString('owner') !== userId) {
      return e.json(200, { valid: false, message: 'Token não pertence a este usuário.' })
    }
    if (record.getBool('revoked')) {
      return e.json(200, { valid: false, message: 'Token revogado.' })
    }

    const expiresAt = record.getString('expiresAt')
    if (expiresAt) {
      const exp = new Date(expiresAt)
      if (exp.getTime() < Date.now()) {
        return e.json(200, { valid: false, message: 'Token expirado.' })
      }
    }

    return e.json(200, { valid: true, message: 'Token válido e ativo.' })
  },
  $apis.requireAuth(),
)
