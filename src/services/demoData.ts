/* HARMOZA — Planilha de demonstração (gerada no cliente)
   PME realista: 12 produtos, 5 clientes, 3 vendedores, 3 regiões,
   8 meses de 2025, ~80 registros. 12 colunas. */

import type { Column, Workbook } from '@/lib/harmoza'

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

const columns: Column[] = [
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

function rand(n: number) {
  return Math.floor(Math.random() * n)
}

export function buildDemoWorkbook(): Workbook {
  const rows: Record<string, unknown>[] = []
  let id = 1
  for (let m = 1; m <= 8; m++) {
    const n = 7 + rand(4)
    for (let i = 0; i < n; i++) {
      const p = products[rand(products.length)]
      const qty = 1 + rand(10)
      const receita = qty * p.preco
      const custo = qty * p.custo
      const lucro = receita - custo
      const dia = 1 + rand(27)
      const data = `2025-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      rows.push({
        id: id++,
        data,
        produto: p.nome,
        categoria: p.cat,
        cliente: clientes[rand(clientes.length)],
        quantidade: qty,
        preco_unitario: p.preco,
        receita,
        custo,
        lucro,
        vendedor: vendedores[rand(vendedores.length)],
        regiao: regioes[rand(regioes.length)],
        status: statuses[rand(statuses.length)],
      })
    }
  }

  return {
    id: 'demo-workbook-' + Date.now(),
    name: 'Demonstração HARMOZA',
    fileName: 'demonstracao_harmoza.xlsx',
    sheets: [
      {
        name: 'Vendas 2025',
        columns,
        rows,
      },
    ],
  }
}
