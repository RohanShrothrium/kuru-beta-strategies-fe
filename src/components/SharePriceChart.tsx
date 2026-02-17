import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { type VaultConfig } from '../config/vaults'
import { formatDate } from '../lib/format'
import { useSharePriceHistory } from '../hooks/useSharePriceApi'

interface Props {
  vault: VaultConfig
}

type ActiveTab = 'price' | 'tvl'
type TimeFrame = 1 | 10 | 30

import { useState, useMemo } from 'react'

function formatTvl(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

export function SharePriceChart({ vault }: Props) {
  const [tab, setTab] = useState<ActiveTab>('price')
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(1)

  // Fetch share price history from API based on selected time frame
  // Uses factory address to aggregate data across all vaults
  const { data, isLoading } = useSharePriceHistory(
    vault.factoryAddress,
    timeFrame,
    undefined,
    !!vault.factoryAddress
  )

  const hasData = data.length > 0

  // Show time for 1-day view, date for longer periods
  const showTime = timeFrame === 1

  const chartData = data.map((d) => ({
    price: d.sharePrice,
    tvl: d.tvl,
    timestamp: d.timestamp,
  }))

  // Derive domain from actual data so sparse data fills the chart width
  const dataStart = hasData ? chartData[0].timestamp : 0
  const dataEnd = hasData ? chartData[chartData.length - 1].timestamp : 0

  // Six evenly-spaced timestamps across the actual data range
  const xAxisTicks = useMemo(() => {
    if (!hasData || dataStart === dataEnd) return []
    const ticks: number[] = []
    for (let i = 0; i <= 5; i++) {
      ticks.push(Math.round(dataStart + (i / 5) * (dataEnd - dataStart)))
    }
    return ticks
  }, [dataStart, dataEnd, hasData])

  // Calculate dynamic Y-axis domain with 10% padding
  const calculateYDomain = () => {
    if (!hasData) return undefined

    const values = chartData.map((d) => (tab === 'price' ? d.price : d.tvl))
    const min = Math.min(...values)
    const max = Math.max(...values)

    // Handle edge case where min === max (single value or flat line)
    if (min === max) {
      const padding = min * 0.1 || 0.1 // 10% padding, or 0.1 if value is 0
      return [min - padding, max + padding]
    }

    // Calculate 10% padding
    const range = max - min
    const padding = range * 0.1

    return [min - padding, max + padding]
  }

  const yDomain = calculateYDomain()

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      {/* Header */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Performance</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {hasData ? `Factory avg · Historic share price · ${timeFrame}d` : 'No history yet'}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-lg border border-surface-border bg-surface-elevated p-0.5">
            {(['price', 'tvl'] as ActiveTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  tab === t
                    ? 'bg-accent-muted text-accent'
                    : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')}
              >
                {t === 'price' ? 'Share Price' : 'TVL'}
              </button>
            ))}
          </div>
        </div>

        {/* Time frame selector */}
        <div className="flex gap-1">
          {([1, 10, 30] as TimeFrame[]).map((days) => (
            <button
              key={days}
              onClick={() => setTimeFrame(days)}
              className={[
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                timeFrame === days
                  ? 'bg-accent-muted text-accent'
                  : 'text-zinc-500 hover:bg-surface-elevated hover:text-zinc-300',
              ].join(' ')}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-52">
        {isLoading ? (
          <LoadingChart />
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6ee7b7" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6ee7b7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252637" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={[dataStart, dataEnd]}
                ticks={xAxisTicks}
                tickFormatter={(ts: number) => formatDate(ts, showTime)}
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                domain={yDomain}
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  tab === 'price' ? v.toFixed(4) : formatTvl(v)
                }
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#13141c',
                  border: '1px solid #252637',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12,
                }}
                formatter={(value: number) =>
                  tab === 'price'
                    ? [`${value.toFixed(6)} ${vault.quoteSymbol}`, 'Share Price']
                    : [formatTvl(value), 'TVL']
                }
                labelStyle={{ color: '#71717a' }}
              />
              <Area
                type="monotone"
                dataKey={tab === 'price' ? 'price' : 'tvl'}
                stroke="#6ee7b7"
                strokeWidth={2}
                fill="url(#colorGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#6ee7b7', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>

    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <div className="h-px w-full bg-surface-border" />
      <div className="flex flex-col items-center gap-1">
        <div className="text-xs font-medium text-zinc-500">Awaiting data</div>
        <div className="text-xs text-zinc-600">
          Share price history will appear here once indexed
        </div>
      </div>
      {/* Wireframe bars */}
      <div className="mt-3 flex w-full items-end justify-around gap-1 px-4">
        {[60, 45, 72, 55, 80, 65, 90, 70, 85, 75].map((h, i) => (
          <div
            key={i}
            className="w-full rounded-t bg-surface-elevated"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="text-xs text-zinc-700">wireframe · data coming soon</div>
    </div>
  )
}

function LoadingChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      <div className="text-xs text-zinc-500">Loading chart data...</div>
    </div>
  )
}
