// HARMOZA — Rotas auxiliares de demonstração
// GET /backend/v1/harmoza/demo — cria a planilha de demonstração para o usuário logado
routerAdd(
  'GET',
  '/backend/v1/harmoza/demo',
  (e) => {
    const auth = e.auth || null
    if (!auth || !auth.id) return e.unauthorizedError('not authenticated')

    const products = [
      { nome: 'Notebook Pro 15', cat: 'Informática', custo: 2200, preco: 3299 },
      { nome: 'Mouse Sem Fio', cat: 'Informática', custo: 35, preco: 79 },
      { nome: 'Teclado Mecânico', cat: 'Informática', custo: 160, preco: 289 },
      { nome: 'Monitor 27" 4K', cat: 'Informática', custo: 950, preco: 1599 },
      { nome: 'Smartphone X10', cat: 'Eletrônicos', custo: 1200, preco: 1899 },
      { nome: 'Fone Bluetooth', cat: 'Eletrônicos', custo: 80, preco: 199 },
      { nome: 'Smart TV 50"', cat: 'Eletrônicos', custo: 1400, preco: 2199 },
      { nome: 'Cafeteira Inteligente', cat: 'Eletrodomésticos', custo: 190, preco: 349 },
      { nome: 'Aspirador Robô', cat: 'Eletrodomésticos', custo: 620, preco: 999 },
      { nome: 'Liquidificador Turbo', cat: 'Eletrodomésticos', custo: 120, preco: 219 },
      { nome: 'Cadeira Ergonomica', cat: 'Móveis', custo: 480, preco: 799 },
      { nome: 'Mesa Ajustável', cat: 'Móveis', custo: 830, preco: 1299 },
    ]
    const clientes = [
      'TechStore Ltda',
      'Mega Comércio',
      'Distribuidora Alpha',
      'Loja Central',
      'Supermercado Bom Preço',
    ]
    const vendedores = ['Ana Souza', 'Carlos Lima', 'Mariana Costa']
    const regioes = ['Sudeste', 'Sul', 'Nordeste']
    const statuses = ['Concluído', 'Concluído', 'Concluído', 'Enviado', 'Cancelado']
    const months = [1, 2, 3, 4, 5, 6, 7, 8]

    const rows = []
    let id = 1
    for (const m of months) {
      const n = 7 + Math.floor(Math.random() * 4)
      for (let i = 0; i < n; i++) {
        const p = products[Math.floor(Math.random() * products.length)]
        const qty = 1 + Math.floor(Math.random() * 10)
        const receita = qty * p.preco
        const custo = qty * p.custo
        const lucro = receita - custo
        const dia = 1 + Math.floor(Math.random() * 27)
        const data = '2025-' + String(m).padStart(2, '0') + '-' + String(dia).padStart(2, '0')
        rows.push({
          id: id++,
          data: data,
          produto: p.nome,
          categoria: p.cat,
          cliente: clientes[Math.floor(Math.random() * clientes.length)],
          quantidade: qty,
          preco_unitario: p.preco,
          receita: receita,
          custo: custo,
          lucro: lucro,
          vendedor: vendedores[Math.floor(Math.random() * vendedores.length)],
          regiao: regioes[Math.floor(Math.random() * regioes.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
        })
      }
    }

    const columns = [
      { name: 'data', type: 'date' },
      { name: 'produto', type: 'text' },
      { name: 'categoria', type: 'text' },
      { name: 'cliente', type: 'text' },
      { name: 'quantidade', type: 'number' },
      { name: 'preco_unitario', type: 'currency' },
      { name: 'receita', type: 'currency' },
      { name: 'custo', type: 'currency' },
      { name: 'lucro', type: 'currency' },
      { name: 'vendedor', type: 'text' },
      { name: 'regiao', type: 'text' },
      { name: 'status', type: 'text' },
    ]

    const wb = {
      id: 'demo-workbook',
      name: 'Demonstração HARMOZA',
      fileName: 'demonstracao_harmoza.xlsx',
      sheets: [
        {
          name: 'Vendas 2025',
          columns: columns,
          rows: rows,
        },
      ],
    }

    const col = $app.findCollectionByNameOrId('workbooks')
    // Remove qualquer demo anterior do usuário para evitar duplicatas
    const existing = $app.findRecordsByFilter(
      col,
      'owner = {:owner} && name = {:name}',
      '-created',
      1,
      0,
      { owner: auth.id, name: 'Demonstração HARMOZA' },
    )
    if (existing && existing.length > 0) {
      const rec = existing[0]
      rec.set('rawJson', JSON.stringify(wb))
      $app.save(rec)
      return e.json(200, { workbook: wb, workbookId: rec.id })
    }

    const rec = new Record(col, {
      owner: auth.id,
      name: 'Demonstração HARMOZA',
      fileName: 'demonstracao_harmoza.xlsx',
      rawJson: JSON.stringify(wb),
    })
    $app.save(rec)
    return e.json(200, { workbook: wb, workbookId: rec.id })
  },
  $apis.requireAuth(),
)
