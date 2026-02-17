import { VAULTS, type VaultConfig } from '../config/vaults'
import { formatAPY, formatDate } from '../lib/format'
import { useAprDataForVault, useMerklCampaignApr, useNavData } from '../hooks/useSharePriceApi'

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
  const { data: aprData } = useAprDataForVault(
    vault.defaultVaultAddress,
    30,
    !!vault.defaultVaultAddress
  )
  const { aprPercent: merklAprPercent } = useMerklCampaignApr(vault.merklCampaignAddress)
  const { data: navData, isLoading: navLoading } = useNavData(vault.factoryAddress, !!vault.factoryAddress)
  const totalApr =
    aprData.aprPercent !== null || merklAprPercent !== null
      ? (aprData.aprPercent ?? 0) + (merklAprPercent ?? 0)
      : null

  const formattedTvl =
    navData !== null
      ? `$${navData.totalTvl.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : '—'

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
          <div className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
            APR
            <span className="group relative cursor-help">
              <span className="text-zinc-600 hover:text-zinc-400">ⓘ</span>
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-surface-border bg-surface-card px-2.5 py-2 text-xs text-zinc-400 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">Vault APR</span>
                    <span>{formatAPY(aprData.aprPercent)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">Merkl</span>
                    <span>{formatAPY(merklAprPercent)}</span>
                  </div>
                  <div className="my-0.5 border-t border-surface-border" />
                  <div className="flex justify-between gap-4 font-medium">
                    <span className="text-zinc-400">Total</span>
                    <span className="text-accent">
                      {formatAPY(
                        aprData.aprPercent !== null || merklAprPercent !== null
                          ? (aprData.aprPercent ?? 0) + (merklAprPercent ?? 0)
                          : null
                      )}
                    </span>
                  </div>
                  {aprData.historical && aprData.latest && (
                    <div className="mt-0.5 text-zinc-600">
                      {formatDate(aprData.historical.timestamp)} → {formatDate(aprData.latest.timestamp)}
                    </div>
                  )}
                  <div className="mt-0.5 text-zinc-600">
                    APR may vary slightly with LTV changes but won't have a material impact.
                  </div>
                </div>
              </span>
            </span>
          </div>
          <div className="font-mono text-sm font-semibold text-accent">
            {formatAPY(totalApr)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">TVL</div>
          <div className="font-mono text-sm font-semibold text-white">
            {navLoading ? '—' : formattedTvl}
          </div>
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
