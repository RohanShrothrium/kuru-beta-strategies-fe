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
  hasVault: boolean
  aprPercent: number | null
}

export function MetricsRow({ vault, data, hasVault, aprPercent }: Props) {
  const { address } = useAccount()

  // Lock is vault-wide: lastKuruDepositTime is set when the owner deposits into Kuru.
  const unlockAt = data.lastKuruDepositTime > 0n
    ? Number(data.lastKuruDepositTime + data.unlockInterval)
    : null

  const isLocked = unlockAt !== null && unlockAt > Math.floor(Date.now() / 1000)

  const userPositionUSD =
    data.userShares !== undefined
      ? Number(data.userShares) * Number(data.sharePrice) / 10 ** (vault.quoteDecimals * 2)
      : null

  // When no vault exists yet, most metrics are not meaningful
  const noVaultSub = 'Create vault to start'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard
        label="Your Vault NAV"
        value={hasVault ? formatUSD(data.totalAssets, vault.quoteDecimals) : '—'}
        sub={hasVault ? `${formatUSD(data.totalAssets, vault.quoteDecimals, { prefix: false })} ${vault.quoteSymbol}` : noVaultSub}
        loading={hasVault && data.isLoading}
      />
      <MetricCard
        label="Share Price"
        value={hasVault ? formatSharePrice(data.sharePrice, vault.quoteDecimals) : '—'}
        sub={hasVault ? `${vault.quoteSymbol} per share` : noVaultSub}
        loading={hasVault && data.isLoading}
        highlight={hasVault}
      />
      <MetricCard
        label={hasVault ? "Your APR" : "APR (example)"}
        value={formatAPY(aprPercent)}
        sub={hasVault ? "30d trailing · your vault" : "30d trailing · sample"}
        loading={false}
        highlight={aprPercent !== null}
      />
      <MetricCard
        label="Aave LTV"
        value={hasVault ? formatLTV(data.currentLTV) : '—'}
        sub={hasVault ? 'target 50% · band 45–55%' : noVaultSub}
        loading={hasVault && data.isLoading}
        warn={
          hasVault && (data.currentLTV > 5500n || (data.currentLTV < 4500n && data.currentLTV > 0n))
        }
      />
      <MetricCard
        label="Unlock Period"
        value={hasVault ? `${Number(data.unlockInterval) / 86400}d` : '4d'}
        sub="after each deposit"
        loading={hasVault && data.isLoading}
      />
      {address ? (
        <MetricCard
          label="Your Position"
          value={
            !hasVault
              ? '—'
              : userPositionUSD !== null
              ? `$${userPositionUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'
          }
          sub={
            !hasVault
              ? noVaultSub
              : data.userShares !== undefined && data.userShares > 0n
              ? isLocked
                ? `Locked · ${formatCountdown(unlockAt!)}`
                : 'Unlocked'
              : 'No position'
          }
          loading={hasVault && data.isLoading}
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
