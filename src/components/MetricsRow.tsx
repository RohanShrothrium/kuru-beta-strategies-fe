import { useAccount } from 'wagmi'
import { type VaultConfig } from '../config/vaults'
import { type VaultData } from '../hooks/useVaultData'
import { type NavData } from '../lib/api'
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
  navData: NavData | null
}

export function MetricsRow({ vault, data, hasVault, aprPercent, navData }: Props) {
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

  // Use aggregated factory data for NAV and Share Price
  const totalNav = navData?.totalTvl ?? 0
  const averageSharePrice = navData?.averageSharePrice ?? 0
  const navLoading = navData === null

  // Format NAV: totalTvl is already in USD, so format directly
  const formattedNav = navData 
    ? `$${totalNav.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'
  
  // Format share price: averageSharePrice is already normalized
  const formattedSharePrice = navData 
    ? averageSharePrice.toFixed(6)
    : '—'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard
        label="Vault NAV"
        value={formattedNav}
        sub={navData ? `Total across all vaults · ${vault.quoteSymbol}` : 'Loading...'}
        loading={navLoading}
      />
      <MetricCard
        label="Share Price"
        value={formattedSharePrice}
        sub={navData ? `Average · ${vault.quoteSymbol} per share` : 'Loading...'}
        loading={navLoading}
        highlight={!!navData}
      />
      <MetricCard
        label="APR"
        value={formatAPY(aprPercent)}
        sub="30d trailing · default vault"
        loading={false}
        highlight={aprPercent !== null}
        tooltip="APR may vary slightly based on your current LTV, but won't have a material impact on overall returns."
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
  tooltip?: string
}

function MetricCard({ label, value, sub, loading, highlight, warn, subWarn, tooltip }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
        {label}
        {tooltip && (
          <span className="group relative cursor-help">
            <span className="text-zinc-600 hover:text-zinc-400">ⓘ</span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-52 -translate-x-1/2 rounded-lg border border-surface-border bg-surface-card px-2.5 py-1.5 text-xs text-zinc-400 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {tooltip}
            </span>
          </span>
        )}
      </div>
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
