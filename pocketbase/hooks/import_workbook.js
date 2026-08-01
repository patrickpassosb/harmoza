routerAdd(
  'POST',
  '/backend/v1/import',
  (e) => {
    const authHeader = e.requestInfo().headers['authorization'] || ''
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    if (!tokenMatch) return e.unauthorizedError('Missing or invalid Authorization header')

    const token = tokenMatch[1].trim()
    const tokenHash = $security.sha256(token)

    let tokenRecord = null
    try {
      tokenRecord = $app.findFirstRecordByFilter('api_tokens', 'tokenHash = {:hash}', {
        hash: tokenHash,
      })
    } catch (_) {}
    if (!tokenRecord) return e.unauthorizedError('Invalid API token')
    if (tokenRecord.getBool('revoked')) return e.unauthorizedError('Token has been revoked')

    const expiresAt = tokenRecord.getString('expiresAt')
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      return e.unauthorizedError('Token has expired')
    }

    const owner = tokenRecord.getString('owner')
    const body = e.requestInfo().body || {}

    const errors = {}
    const name = String(body.name || '').trim()
    if (!name) errors.name = new ValidationError('validation_required', 'O nome é obrigatório.')

    const source = String(body.source || '').trim()
    if (!source)
      errors.source = new ValidationError('validation_required', 'O source é obrigatório.')

    const sheets = body.sheets
    if (!Array.isArray(sheets) || sheets.length === 0) {
      errors.sheets = new ValidationError(
        'validation_required',
        'sheets deve ser um array não-vazio.',
      )
    }

    if (Object.keys(errors).length > 0) throw new BadRequestError('Dados inválidos', errors)

    let totalRows = 0
    const convertedSheets = []
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i]
      if (!s || !s.name || !String(s.name).trim()) {
        throw new BadRequestError('Dados inválidos', {
          ['sheets[' + i + '].name']: new ValidationError(
            'validation_required',
            'O nome da aba é obrigatório.',
          ),
        })
      }
      if (!Array.isArray(s.columns)) {
        throw new BadRequestError('Dados inválidos', {
          ['sheets[' + i + '].columns']: new ValidationError(
            'validation_required',
            'columns deve ser um array.',
          ),
        })
      }
      if (!Array.isArray(s.rows)) {
        throw new BadRequestError('Dados inválidos', {
          ['sheets[' + i + '].rows']: new ValidationError(
            'validation_required',
            'rows deve ser um array.',
          ),
        })
      }
      if (s.rows.length > 10000) {
        throw new BadRequestError('Dados inválidos', {
          ['sheets[' + i + '].rows']: new ValidationError(
            'validation_max_rows',
            'Máximo de 10.000 linhas por aba.',
          ),
        })
      }

      totalRows += s.rows.length
      const colNames = s.columns.map(function (c) {
        return c.name
      })
      const arrRows = s.rows.map(function (r) {
        return colNames.map(function (cn) {
          return r[cn] !== undefined ? r[cn] : null
        })
      })

      convertedSheets.push({
        id: 'sheet-' + Math.random().toString(36).slice(2, 9),
        name: s.name,
        columns: s.columns,
        rows: arrRows,
      })
    }

    const wbData = {
      fileName: name,
      sheets: convertedSheets,
      activeSheetId: convertedSheets[0].id,
    }

    let existing = null
    try {
      existing = $app.findFirstRecordByFilter(
        'workbooks',
        'owner = {:owner} && source = {:source}',
        { owner: owner, source: source },
      )
    } catch (_) {}

    if (existing) {
      existing.set('name', name)
      existing.set('fileName', name)
      existing.set('rawJson', JSON.stringify(wbData))
      $app.save(existing)
      return e.json(200, {
        workbookId: existing.id,
        name: name,
        source: source,
        sheetsCount: convertedSheets.length,
        rowsCount: totalRows,
      })
    }

    const col = $app.findCollectionByNameOrId('workbooks')
    const record = new Record(col, {
      owner: owner,
      name: name,
      fileName: name,
      source: source,
      rawJson: JSON.stringify(wbData),
    })
    $app.save(record)
    return e.json(200, {
      workbookId: record.id,
      name: name,
      source: source,
      sheetsCount: convertedSheets.length,
      rowsCount: totalRows,
    })
  },
  $apis.bodyLimit(5 * 1024 * 1024),
)
