import { type VaultConfig } from '../config/vaults'
import { useVaultData, useUserVault } from '../hooks/useVaultData'
import { useAprData } from '../hooks/useSharePriceApi'
import { MetricsRow } from './MetricsRow'
import { SharePriceChart } from './SharePriceChart'
import { ActionPanel } from './ActionPanel'

interface Props {
  vault: VaultConfig
  onBack: () => void
}

export function VaultPage({ vault, onBack }: Props) {
  // Resolve the connected user's personal vault clone address (or undefined if none).
  const { userVaultAddress, hasVault, refetch: refetchVault } = useUserVault(vault)

  // All on-chain metrics come from the user's own vault.
  // When hasVault is false, data returns sensible zero-defaults.
  const data = useVaultData(vault, userVaultAddress)

  // Use user's vault if they have one, otherwise show default vault as example
  const vaultToQuery = userVaultAddress || vault.defaultVaultAddress || ''

  // Fetch APR data (30-day trailing)
  const { data: aprData } = useAprData(
    vaultToQuery,
    30,
    !!vaultToQuery // Only fetch if we have a vault address
  )

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Back + breadcrumb */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
      >
        <span>←</span>
        <span>All vaults</span>
      </button>

      {/* Vault hero */}
      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Tag>{vault.baseSymbol}</Tag>
          <Tag>{vault.quoteSymbol}</Tag>
          <Tag dim>Delta Neutral</Tag>
          <Tag dim>Kuru + Neverland</Tag>
          <Tag dim>Per-User Vault</Tag>
        </div>
        <h1 className="text-2xl font-semibold text-white">{vault.name}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {vault.description}
        </p>
        {!hasVault && vault.defaultVaultAddress && (
          <p className="mt-2 text-xs text-amber-400">
            📊 Showing example data from a sample vault. Create your own vault to track your personal performance.
          </p>
        )}
      </div>

      {/* Metrics row */}
      <div className="mb-6">
        <MetricsRow vault={vault} data={data} hasVault={hasVault} aprPercent={aprData.aprPercent} />
      </div>

      {/* Chart + Action side-by-side */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SharePriceChart vault={vault} userVaultAddress={userVaultAddress} />
        </div>
        <div>
          <ActionPanel
            vault={vault}
            data={data}
            userVaultAddress={userVaultAddress}
            hasVault={hasVault}
            refetchVault={refetchVault}
          />
        </div>
      </div>

      {/* Strategy + Risk */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="How it works">
          <ol className="flex flex-col gap-2">
            {vault.strategy.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-400">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </InfoCard>

        <InfoCard title="Risk factors">
          <ul className="flex flex-col gap-2">
            {vault.risks.map((risk, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-400">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {risk}
              </li>
            ))}
          </ul>
        </InfoCard>
      </div>

      {/* Contract addresses */}
      <div className="mt-4 rounded-xl border border-surface-border bg-surface-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Contracts</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <AddressRow label="VaultFactory" address={vault.factoryAddress} />
          <AddressRow label="Implementation" address={vault.implementationAddress} />
          <AddressRow label="Quote token" address={vault.quoteAddress} />
          {userVaultAddress && (
            <AddressRow label="Your vault" address={userVaultAddress} highlight />
          )}
        </div>
      </div>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Tag({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <span
      className={[
        'rounded-full border px-2.5 py-0.5 text-xs font-medium',
        dim
          ? 'border-zinc-800 bg-zinc-900 text-zinc-500'
          : 'border-accent/30 bg-accent-muted text-accent',
      ].join(' ')}
    >
      {children}
    </span>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  )
}

function AddressRow({
  label,
  address,
  highlight,
}: {
  label: string
  address: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={['text-xs', highlight ? 'text-accent' : 'text-zinc-500'].join(' ')}>
        {label}
      </span>
      <a
        href={`https://monadvision.com/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate font-mono text-xs text-zinc-400 underline-offset-2 hover:text-accent hover:underline"
      >
        {address}
      </a>
    </div>
  )
}

