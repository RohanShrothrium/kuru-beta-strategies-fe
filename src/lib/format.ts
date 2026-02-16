// Formatting utilities

export function formatUSD(
  raw: bigint,
  decimals: number,
  opts: { digits?: number; prefix?: boolean } = {},
): string {
  const { digits = 2, prefix = true } = opts
  const value = Number(raw) / 10 ** decimals
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
  return prefix ? `$${formatted}` : formatted
}

export function formatShares(raw: bigint, quoteDecimals: number, digits = 4): string {
  const value = Number(raw) / 10 ** quoteDecimals
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

// Share price: convertToAssets(10**quoteDecimals) / 10**quoteDecimals
// Starts at 1.000000 and increases as yield accrues.
export function formatSharePrice(raw: bigint, quoteDecimals: number): string {
  const value = Number(raw) / 10 ** quoteDecimals
  return value.toFixed(6)
}

export function formatLTV(bps: bigint): string {
  return (Number(bps) / 100).toFixed(2) + '%'
}

export function formatAPY(apy: number | null): string {
  if (apy === null) return '—'
  return apy.toFixed(2) + '%'
}

// Format a unix timestamp (seconds) as a countdown string "Xd Xh Xm"
export function formatCountdown(unlockAt: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = unlockAt - now
  if (diff <= 0) return 'Unlocked'
  const d = Math.floor(diff / 86400)
  const h = Math.floor((diff % 86400) / 3600)
  const m = Math.floor((diff % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatDate(timestamp: number, showTime = false): string {
  const date = new Date(timestamp * 1000)
  
  if (showTime) {
    // For short time frames, show time
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  
  // For longer time frames, show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

// Format a base token amount (e.g. MON with 18 decimals) up to 6 significant figures.
export function formatBase(raw: bigint, decimals: number, symbol: string): string {
  const value = Number(raw) / 10 ** decimals
  const formatted =
    value < 0.000001
      ? value.toExponential(2)
      : value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        })
  return `${formatted} ${symbol}`
}
