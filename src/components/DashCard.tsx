import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Trophy } from 'lucide-react'
import type { DashComponent } from '@/lib/types'

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
]

function fmtVal(v: number, currency?: boolean): string {
  if (currency)
    return v.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    })
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export function DashCardBody({ comp }: { comp: DashComponent }) {
  const data = comp.data ?? []
  const currency = (comp.config?.currency as boolean) ?? false
  switch (comp.kind) {
    case 'kpi': {
      const value = (comp.config?.value as string) ?? '—'
      const trend = comp.config?.trend as string | undefined
      return (
        <div className="flex h-full flex-col justify-between p-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{comp.title}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          </div>
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              {trend.startsWith('-') ? (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              )}
              <span className={trend.startsWith('-') ? 'text-red-600' : 'text-emerald-600'}>
                {trend}
              </span>
            </div>
          )}
          {comp.subtitle && <p className="mt-1 text-xs text-muted-foreground">{comp.subtitle}</p>}
        </div>
      )
    }
    case 'bar':
      return (
        <div className="h-full w-full p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  currency ? fmtVal(v, true).replace(/\s?R\$\s?/, '') : fmtVal(v)
                }
                width={60}
              />
              <Tooltip
                formatter={(v: number) => fmtVal(v, currency)}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid hsl(var(--border))',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    case 'line':
      return (
        <div className="h-full w-full p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  currency ? fmtVal(v, true).replace(/\s?R\$\s?/, '') : fmtVal(v)
                }
                width={60}
              />
              <Tooltip
                formatter={(v: number) => fmtVal(v, currency)}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid hsl(var(--border))',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={COLORS[0]}
                strokeWidth={3}
                dot={{ r: 3, fill: COLORS[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    case 'pie':
      return (
        <div className="h-full w-full p-3">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius="72%"
                innerRadius="42%"
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => fmtVal(v, currency)}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid hsl(var(--border))',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )
    case 'ranking': {
      const top = data.slice(0, 6)
      const max = Math.max(...top.map((d) => d.value), 1)
      return (
        <div className="flex h-full flex-col gap-2 overflow-auto p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-amber-500" /> Ranking
          </div>
          {top.map((d, i) => (
            <div key={d.label} className="flex items-center gap-2">
              <span className="w-5 text-right text-xs font-semibold text-muted-foreground">
                {i + 1}º
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium text-foreground">{d.label}</span>
                  <span className="ml-2 text-muted-foreground">{fmtVal(d.value, currency)}</span>
                </div>
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#172554] to-[#0F766E]"
                    style={{ width: (d.value / max) * 100 + '%' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
    case 'table': {
      const rows = data.slice(0, 8)
      return (
        <div className="h-full overflow-auto p-3">
          <table className="w-full text-xs">
            <tbody>
              {rows.map((d) => (
                <tr key={d.label} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-2 font-medium text-foreground">{d.label}</td>
                  <td className="py-1.5 text-right text-muted-foreground">
                    {fmtVal(d.value, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    default:
      return null
  }
}
