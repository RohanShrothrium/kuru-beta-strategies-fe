import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
  return (
    <header className="border-b border-surface-border bg-surface-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted">
            <span className="text-sm font-bold text-accent">K</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-white">Kuru</span>
            <span className="ml-1 text-sm text-zinc-500">Strategies</span>
          </div>
          <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-400">
            Beta
          </span>
        </div>

        {/* Wallet */}
        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus="address"
        />
      </div>
    </header>
  )
}
