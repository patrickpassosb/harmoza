import type { Workbook, SheetData } from './types'

const P: [string, string, number, number][] = [
  ['Café Torrado 500g', 'Mercearia', 18.9, 12.5],
  ['Arroz 5kg', 'Mercearia', 24.9, 18.2],
  ['Feijão 1kg', 'Mercearia', 8.4, 5.9],
  ['Óleo de Soja 900ml', 'Mercearia', 7.9, 5.2],
  ['Açúcar 1kg', 'Mercearia', 4.5, 3.1],
  ['Macarrão 500g', 'Mercearia', 5.2, 3.6],
  ['Leite Integral 1L', 'Bebidas', 6.3, 4.4],
  ['Refrigerante 2L', 'Bebidas', 11.9, 8.1],
  ['Suco de Laranja 1L', 'Bebidas', 9.9, 6.8],
  ['Água Mineral 500ml (cx)', 'Bebidas', 12.5, 8.9],
  ['Detergente 500ml', 'Limpeza', 3.9, 2.4],
  ['Sabão em Pó 1kg', 'Limpeza', 14.9, 10.6],
  ['Desinfetante 2L', 'Limpeza', 9.5, 6.7],
  ['Papel Higiênico 12un', 'Higiene', 22.9, 16.4],
  ['Sabonete 90g', 'Higiene', 3.2, 2.0],
  ['Shampoo 350ml', 'Higiene', 16.9, 11.8],
]
const CL = [
  'Mercadinho Bom Preço',
  'Supermercado Vila Nova',
  'Empório Central',
  'Padaria Pão Dourado',
  'Restaurante Sabor Caseiro',
  'Distribuidora Horizonte',
  'Lanchonete do Zé',
  'Mercado São José',
]
const V = [
  'Ana Paula',
  'Carlos Mendes',
  'Fernanda Lima',
  'João Pedro',
  'Mariana Costa',
  'Roberto Alves',
]
const R = ['Sul', 'Sudeste', 'Centro-Oeste', 'Nordeste', 'Norte']
const ST = ['Entregue', 'Em trânsito', 'Pendente', 'Entregue', 'Entregue', 'Cancelado']

function buildDemoSheet(): SheetData {
  const columns = [
    { name: 'Data', type: 'date' as const },
    { name: 'Produto', type: 'text' as const },
    { name: 'Categoria', type: 'text' as const },
    { name: 'Cliente', type: 'text' as const },
    { name: 'Quantidade', type: 'number' as const },
    { name: 'Preço Unitário', type: 'currency' as const },
    { name: 'Receita', type: 'currency' as const },
    { name: 'Custo', type: 'currency' as const },
    { name: 'Lucro', type: 'currency' as const },
    { name: 'Vendedor', type: 'text' as const },
    { name: 'Região', type: 'text' as const },
    { name: 'Status do Pedido', type: 'text' as const },
  ]
  const rows: (string | number | null)[][] = []
  const meses: [string, number[]][] = [
    ['2025-01', [5, 12, 19, 26]],
    ['2025-02', [3, 10, 17, 24]],
    ['2025-03', [4, 11, 18, 25]],
    ['2025-04', [2, 9, 16, 23, 30]],
    ['2025-05', [6, 13, 20, 27]],
  ]
  let n = 0
  for (const [mes, dias] of meses) {
    for (const dia of dias) {
      for (let k = 0; k < 3; k++) {
        if (n >= 60) break
        const [produto, categoria, preco, custo] = P[n % P.length]
        const qtd = 8 + ((n * 7) % 60)
        const receita = Math.round(qtd * preco * 100) / 100
        const custoT = Math.round(qtd * custo * 100) / 100
        rows.push([
          `${mes}-${String(dia).padStart(2, '0')}`,
          produto,
          categoria,
          CL[(n * 3) % CL.length],
          qtd,
          preco,
          receita,
          custoT,
          Math.round((receita - custoT) * 100) / 100,
          V[n % V.length],
          R[n % R.length],
          ST[n % ST.length],
        ])
        n++
      }
    }
  }
  return { id: 'demo-vendas', name: 'Vendas 2025', columns, rows }
}

export function demoWorkbook(): Workbook {
  return {
    id: 'demo-workbook',
    fileName: 'Vendas_2025.xlsx',
    sheets: [buildDemoSheet()],
    activeSheetId: 'demo-vendas',
  }
}
