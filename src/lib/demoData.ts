// HARMOZA — planilha de demonstração (gerada no cliente)
// PME realista: 12 produtos, 5 clientes, 3 vendedores, 3 regiões,
// 8 meses de 2025, ~80 registros. 12 colunas.
import type { CellValue, Sheet } from './types'

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
  { nome: 'Cadeira Ergonômica', cat: 'Móveis', custo: 480, preco: 799 },
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

const HEADERS = [
  'data',
  'produto',
  'categoria',
  'cliente',
  'quantidade',
  'preco_unitario',
  'receita',
  'custo',
  'lucro',
  'vendedor',
  'regiao',
  'status',
]

const TYPES: Record<string, string> = {
  data: 'date',
  produto: 'text',
  categoria: 'text',
  cliente: 'text',
  quantidade: 'number',
  preco_unitario: 'currency',
  receita: 'currency',
  custo: 'currency',
  lucro: 'currency',
  vendedor: 'text',
  regiao: 'text',
  status: 'text',
}

export function createDemoSheet(): Sheet {
  const rows: CellValue[][] = []
  let id = 1
  let seed = 7
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let m = 1; m <= 8; m++) {
    const n = 7 + Math.floor(rand() * 4)
    for (let i = 0; i < n; i++) {
      const p = products[Math.floor(rand() * products.length)]
      const qty = 1 + Math.floor(rand() * 10)
      const receita = qty * p.preco
      const custo = qty * p.custo
      const lucro = receita - custo
      const dia = 1 + Math.floor(rand() * 27)
      const data = `2025-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      rows.push([
        data,
        p.nome,
        p.cat,
        clientes[Math.floor(rand() * clientes.length)],
        qty,
        p.preco,
        Math.round(receita * 100) / 100,
        Math.round(custo * 100) / 100,
        Math.round(lucro * 100) / 100,
        vendedores[Math.floor(rand() * vendedores.length)],
        regioes[Math.floor(rand() * regioes.length)],
        statuses[Math.floor(rand() * statuses.length)],
      ])
      id++
    }
  }
  return { id: 'sheet-demo', name: 'Vendas 2025', columns: HEADERS, rows, columnTypes: TYPES }
}
