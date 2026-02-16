import { VAULTS, type VaultConfig } from '../config/vaults'
import { formatAPY } from '../lib/format'
import { useUserVault } from '../hooks/useVaultData'
import { useAprData } from '../hooks/useSharePriceApi'

interface Props {
  onSelect: (vault: VaultConfig) => void
}

export function VaultList({ onSelect }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Vaults</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Delta-neutral market-making strategies on Monad. Deposit stablecoins, earn
          orderbook fees.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VAULTS.map((vault) => (
          <VaultCard key={vault.id} vault={vault} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function VaultCard({ vault, onSelect }: { vault: VaultConfig; onSelect: (v: VaultConfig) => void }) {
  // Get user's personal vault address (if they have one)
  const { userVaultAddress, hasVault } = useUserVault(vault)
  
  // Fetch APR data from user's personal vault (30-day trailing)
  // Only fetch if user has a vault
  const { data: aprData } = useAprData(
    userVaultAddress || '',
    30,
    hasVault, // Only fetch if user has a vault
    60_000
  )
  return (
    <button
      onClick={() => !vault.comingSoon && onSelect(vault)}
      className={[
        'relative flex flex-col rounded-xl border p-5 text-left transition-all',
        vault.comingSoon
          ? 'cursor-default border-surface-border bg-surface-card opacity-60'
          : 'border-surface-border bg-surface-card hover:border-accent/40 hover:bg-surface-elevated',
      ].join(' ')}
    >
      {vault.comingSoon && (
        <span className="absolute right-4 top-4 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          Coming soon
        </span>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex gap-1.5">
          <TokenBadge symbol={vault.baseSymbol} />
          <TokenBadge symbol={vault.quoteSymbol} />
        </div>
      </div>

      <h2 className="mb-1 text-base font-semibold text-white">{vault.name}</h2>
      <p className="mb-4 text-xs leading-relaxed text-zinc-400">{vault.tagline}</p>

      {/* Metrics footer */}
      <div className="mt-auto flex items-center justify-between border-t border-surface-border pt-4">
        <div>
          <div className="text-xs text-zinc-500">APR</div>
          <div className="font-mono text-sm font-semibold text-accent">
            {hasVault ? formatAPY(aprData.aprPercent) : '—'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">Strategy</div>
          <div className="text-xs font-medium text-zinc-300">Delta Neutral</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">Lock</div>
          <div className="text-xs font-medium text-zinc-300">4 days</div>
        </div>
      </div>
    </button>
  )
}

function TokenBadge({ symbol }: { symbol: string }) {
  return (
    <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium text-zinc-300 border border-surface-border">
      {symbol}
    </span>
  )
}
