import { type VaultConfig } from '../config/vaults'
import { useVaultData } from '../hooks/useVaultData'
import { MetricsRow } from './MetricsRow'
import { SharePriceChart } from './SharePriceChart'
import { ActionPanel } from './ActionPanel'

interface Props {
  vault: VaultConfig
  onBack: () => void
}

export function VaultPage({ vault, onBack }: Props) {
  const data = useVaultData(vault)

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
        </div>
        <h1 className="text-2xl font-semibold text-white">{vault.name}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {vault.description}
        </p>
      </div>

      {/* Metrics row */}
      <div className="mb-6">
        <MetricsRow vault={vault} data={data} />
      </div>

      {/* Chart + Action side-by-side */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* API TODO: replace vault.apyHistory with fetched data from /api/vaults/:id/history */}
          <SharePriceChart vault={vault} data={vault.apyHistory} />
        </div>
        <div>
          <ActionPanel vault={vault} data={data} />
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
          <AddressRow label="Proxy (vault)" address={vault.proxyAddress} />
          <AddressRow label="Implementation" address={vault.implementationAddress} />
          <AddressRow label="Quote token" address={vault.quoteAddress} />
        </div>
      </div>

      {/* API data requirements */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h3 className="mb-3 text-sm font-semibold text-zinc-400">
          API endpoints needed
        </h3>
        <div className="flex flex-col gap-2 font-mono text-xs text-zinc-600">
          <ApiEndpoint
            method="GET"
            path={`/api/vaults/${vault.id}/history?interval=1h&limit=720`}
            returns="SharePricePoint[] — { timestamp, sharePrice, tvl }"
          />
          <ApiEndpoint
            method="GET"
            path={`/api/vaults/${vault.id}/apy?window=30d`}
            returns="{ apy: number } — 30-day trailing APY"
          />
          <ApiEndpoint
            method="GET"
            path={`/api/vaults/${vault.id}/positions?address=0x…`}
            returns="{ shares, valueUSD, pnl, depositedAt } — user position history"
          />
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

function AddressRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
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

function ApiEndpoint({
  method,
  path,
  returns,
}: {
  method: string
  path: string
  returns: string
}) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5">
      <div className="flex gap-2">
        <span className="text-emerald-700">{method}</span>
        <span className="text-zinc-500">{path}</span>
      </div>
      <div className="mt-1 text-zinc-700">→ {returns}</div>
    </div>
  )
}
