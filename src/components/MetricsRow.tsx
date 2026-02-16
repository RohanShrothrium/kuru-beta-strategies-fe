import { useAccount } from 'wagmi'
import { type VaultConfig } from '../config/vaults'
import { type VaultData } from '../hooks/useVaultData'
import {
  formatUSD,
  formatShares,
  formatSharePrice,
  formatLTV,
  formatAPY,
  formatCountdown,
} from '../lib/format'

interface Props {
  vault: VaultConfig
  data: VaultData
}

export function MetricsRow({ vault, data }: Props) {
  const { address } = useAccount()

  const unlockAt = data.lastDepositTime
    ? Number(data.lastDepositTime + data.unlockInterval)
    : null

  const isLocked = unlockAt !== null && unlockAt > Math.floor(Date.now() / 1000)

  const userPositionUSD =
    data.userShares !== undefined
      ? Number(data.userShares) * Number(data.sharePrice) / 10 ** (vault.quoteDecimals * 2)
      : null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard
        label="TVL"
        value={formatUSD(data.totalAssets, vault.quoteDecimals)}
        sub={`${formatUSD(data.totalAssets, vault.quoteDecimals, { prefix: false })} ${vault.quoteSymbol}`}
        loading={data.isLoading}
      />
      <MetricCard
        label="Share Price"
        value={formatSharePrice(data.sharePrice, vault.quoteDecimals)}
        sub={`${vault.quoteSymbol} per share`}
        loading={data.isLoading}
        highlight
      />
      <MetricCard
        label="APY"
        value={formatAPY(vault.apy)}
        sub="30-day trailing"
        loading={false}
        highlight={vault.apy !== null}
      />
      <MetricCard
        label="Aave LTV"
        value={formatLTV(data.currentLTV)}
        sub="target 50% · band 45–55%"
        loading={data.isLoading}
        warn={
          data.currentLTV > 5500n || (data.currentLTV < 4500n && data.currentLTV > 0n)
        }
      />
      <MetricCard
        label="Unlock Period"
        value={`${Number(data.unlockInterval) / 86400}d`}
        sub="after each deposit"
        loading={data.isLoading}
      />
      {address ? (
        <MetricCard
          label="Your Position"
          value={
            userPositionUSD !== null
              ? `$${userPositionUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'
          }
          sub={
            data.userShares !== undefined && data.userShares > 0n
              ? isLocked
                ? `Locked · ${formatCountdown(unlockAt!)}`
                : 'Unlocked'
              : 'No position'
          }
          loading={data.isLoading}
          subWarn={isLocked}
        />
      ) : (
        <MetricCard label="Your Position" value="—" sub="Connect wallet" loading={false} />
      )}
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string
  sub: string
  loading: boolean
  highlight?: boolean
  warn?: boolean
  subWarn?: boolean
}

function MetricCard({ label, value, sub, loading, highlight, warn, subWarn }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="mb-1 text-xs text-zinc-500">{label}</div>
      {loading ? (
        <div className="h-6 w-20 animate-pulse rounded bg-surface-elevated" />
      ) : (
        <div
          className={[
            'font-mono text-lg font-semibold',
            warn ? 'text-amber-400' : highlight ? 'text-accent' : 'text-white',
          ].join(' ')}
        >
          {value}
        </div>
      )}
      <div className={['mt-0.5 text-xs', subWarn ? 'text-amber-400' : 'text-zinc-500'].join(' ')}>
        {sub}
      </div>
    </div>
  )
}
