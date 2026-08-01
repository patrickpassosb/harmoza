/* HARMOZA — Renderizador de widgets (KPIs e gráficos com recharts) */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { Widget } from '@/lib/harmoza'
import { currency, formatNumber, formatPct } from '@/lib/harmoza'

const PALETTE = [
  '#172554',
  '#0F766E',
  '#D97706',
  '#6D28D9',
  '#0E7490',
  '#B45309',
  '#4F46E5',
  '#047857',
]

function formatValue(w: Widget, n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (w.kpiType === 'currency') return currency(n)
  if (w.kpiType === 'percentage') return formatPct(n)
  return formatNumber(n)
}

function KpiCard({ widget }: { widget: Widget }) {
  const d = widget.data
  const val = d?.kpiValue ?? null
  return (
    <div className="flex h-full flex-col justify-center p-4">
      <div className="text-sm font-medium text-muted-foreground">{widget.title}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
        {formatValue(widget, val)}
      </div>
      {d?.kpiDelta !== undefined && d?.kpiDelta !== null && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <span className={d.kpiDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
            {d.kpiDelta >= 0 ? '▲' : '▼'} {Math.abs(d.kpiDelta).toLocaleString('pt-BR')}%
          </span>
          {d.kpiDeltaLabel && <span className="text-muted-foreground">{d.kpiDeltaLabel}</span>}
        </div>
      )}
    </div>
  )
}

function ChartBars({ widget }: { widget: Widget }) {
  const d = widget.data
  const labels = d?.labels ?? []
  const values = d?.values ?? []
  const data = labels.map((l, i) => ({ name: l, valor: values[i] ?? 0 }))
  return (
    <div className="h-full w-full p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,37,84,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
          <Tooltip
            formatter={(v: number) => currency(v)}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid rgba(23,37,84,0.1)',
              fontSize: 12,
            }}
          />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]} fill="#0F766E" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartLine({ widget }: { widget: Widget }) {
  const d = widget.data
  const labels = d?.labels ?? []
  const values = d?.values ?? []
  const data = labels.map((l, i) => ({ name: l, valor: values[i] ?? 0 }))
  return (
    <div className="h-full w-full p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,37,84,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
          <Tooltip
            formatter={(v: number) => currency(v)}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid rgba(23,37,84,0.1)',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke="#172554"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartArea({ widget }: { widget: Widget }) {
  const d = widget.data
  const labels = d?.labels ?? []
  const values = d?.values ?? []
  const data = labels.map((l, i) => ({ name: l, valor: values[i] ?? 0 }))
  return (
    <div className="h-full w-full p-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="harmoza-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97706" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#D97706" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,37,84,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
          <Tooltip
            formatter={(v: number) => currency(v)}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid rgba(23,37,84,0.1)',
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke="#D97706"
            strokeWidth={2.5}
            fill="url(#harmoza-area)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartPie({ widget }: { widget: Widget }) {
  const d = widget.data
  const labels = d?.labels ?? []
  const values = d?.values ?? []
  const data = labels.map((l, i) => ({ name: l, value: values[i] ?? 0 }))
  return (
    <div className="h-full w-full p-3">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => currency(v)}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid rgba(23,37,84,0.1)',
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function RankingList({ widget }: { widget: Widget }) {
  const d = widget.data
  const labels = d?.labels ?? []
  const values = d?.values ?? []
  const max = Math.max(...values, 1)
  const isCurrency = widget.title.toLowerCase().includes('produto') || values.some((v) => v > 1000)
  const fmt = (v: number) => (isCurrency ? currency(v) : formatNumber(v))
  return (
    <div className="h-full w-full space-y-1.5 overflow-y-auto p-4 harmoza-scroll">
      {labels.slice(0, 10).map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 text-right text-xs font-semibold text-muted-foreground">
            {i + 1}º
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate font-medium">{l}</span>
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                {fmt(values[i] ?? 0)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${Math.round(((values[i] ?? 0) / max) * 100)}%`,
                  background: PALETTE[i % PALETTE.length],
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function WidgetTable({ widget }: { widget: Widget }) {
  const rows = widget.data?.rows as Record<string, unknown>[] | undefined
  const labels = widget.data?.labels ?? []
  const values = widget.data?.values ?? []
  if (rows && rows.length > 0) {
    const keys = Object.keys(rows[0])
    return (
      <div className="h-full w-full overflow-auto p-3 harmoza-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              {keys.map((k) => (
                <th key={k} className="pb-2 pr-3 font-medium">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-muted/60 last:border-0">
                {keys.map((k) => (
                  <td key={k} className="py-1.5 pr-3">
                    {typeof r[k] === 'number' ? formatNumber(r[k] as number) : String(r[k] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <div className="h-full w-full p-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Item</th>
            <th className="pb-2 font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {labels.slice(0, 10).map((l, i) => (
            <tr key={i} className="border-b border-muted/60 last:border-0">
              <td className="py-1.5 pr-3">{l}</td>
              <td className="py-1.5">{currency(values[i] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WidgetRenderer({ widget }: { widget: Widget }) {
  switch (widget.kind) {
    case 'kpi':
      return <KpiCard widget={widget} />
    case 'bar':
      return <ChartBars widget={widget} />
    case 'line':
      return <ChartLine widget={widget} />
    case 'area':
      return <ChartArea widget={widget} />
    case 'pie':
      return <ChartPie widget={widget} />
    case 'ranking':
      return <RankingList widget={widget} />
    case 'table':
      return <WidgetTable widget={widget} />
    default:
      return null
  }
}
