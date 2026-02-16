// ============================================================
// Vault Configuration
// ============================================================
// All on-chain addresses for each QuoteOnlyVault deployment.
// Add new vaults here — the UI picks them up automatically.
//
// API data fields that need to be hydrated (currently placeholder):
//   - apy:          30d trailing APY from indexed share price data
//   - apyHistory:   time-series of { timestamp, sharePrice, tvl } for the chart
//   - totalDeposited: aggregate USDC deposited across all users
// ============================================================

export const VAULT_ABI = [
  // ── User actions ───────────────────────────────────────────
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'quoteAmount', type: 'uint256' }],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: 'quoteReturned', type: 'uint256' }],
  },
  // ── Preview (view) ─────────────────────────────────────────
  {
    name: 'previewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'quoteAmount', type: 'uint256' }],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'previewWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: 'quoteReturned', type: 'uint256' }],
  },
  {
    name: 'previewWithdrawAmounts',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [
      { name: 'quoteReturned', type: 'uint256' },
      { name: 'baseReturned', type: 'uint256' },
    ],
  },
  // ── NAV / metrics ──────────────────────────────────────────
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'quoteAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'currentLTV',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ── User state ─────────────────────────────────────────────
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'unlockInterval',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lastDepositTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ── ERC20 (inherited) ──────────────────────────────────────
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  // ── Events ─────────────────────────────────────────────────
  {
    name: 'Withdraw',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'sharesBurned', type: 'uint256', indexed: false },
      { name: 'quoteReturned', type: 'uint256', indexed: false },
      { name: 'baseReturned', type: 'uint256', indexed: false },
    ],
  },
] as const

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const

// ── Share price history shape (populated by API later) ──────
export interface SharePricePoint {
  timestamp: number   // unix seconds
  sharePrice: number  // USDC per 1 share-unit (quote-decimal normalised)
  tvl: number         // total assets in USD
}

export interface VaultConfig {
  id: string
  name: string
  tagline: string
  description: string
  strategy: string[]      // bullet points explaining the strategy
  risks: string[]         // key risks
  baseSymbol: string
  baseDecimals: number
  quoteSymbol: string
  quoteAddress: `0x${string}`
  quoteDecimals: number
  proxyAddress: `0x${string}`
  implementationAddress: `0x${string}`
  comingSoon?: boolean
  // API-sourced fields (placeholder until APIs are wired)
  apy: number | null       // null = not yet available
  apyHistory: SharePricePoint[]
}

export const VAULTS: VaultConfig[] = [
  {
    id: 'monusdc',
    name: 'MON / USDC Delta Neutral',
    tagline: 'Market-making yield with no directional MON exposure',
    description:
      'Deposit USDC and earn market-making fees from the Kuru MON/USDC orderbook. ' +
      'The vault borrows MON from Neverland (Aave V3 fork) to construct a delta-neutral ' +
      'position — your MON long inside Kuru is exactly offset by the Neverland borrow, ' +
      'leaving you with pure USDC-denominated yield.',
    strategy: [
      'Your USDC is split: ~50% stays as Aave collateral, ~50% goes into the Kuru MON/USDC market-making vault.',
      'MON is borrowed from Neverland at ~50% LTV against the collateral and deposited alongside the USDC into Kuru.',
      'Kuru earns spread and fee revenue by providing liquidity around the mid-price.',
      'The Neverland borrow precisely offsets the MON long in Kuru, making returns delta-neutral to MON price.',
      'A keeper calls rebalance() when LTV drifts outside 45–55% to keep the hedge tight.',
    ],
    risks: [
      'Smart contract risk in QuoteOnlyVault, Kuru, and Neverland.',
      'Oracle risk: positions are priced by the Neverland oracle (RedStone).',
      'LTV drift: rapid MON price moves can widen the hedge before rebalance fires.',
      'Liquidity risk: Kuru withdrawals are subject to a 4-day unlock period.',
      'Neverland borrow rate risk: rising borrow rates reduce net yield.',
    ],
    baseSymbol: 'MON',
    baseDecimals: 18,
    quoteSymbol: 'USDC',
    quoteAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    quoteDecimals: 6,
    proxyAddress: '0xb49ba2E12a7d2BfF6E2870A0B9b7Ab387737abAF',
    implementationAddress: '0x7e2c26bF237c2AC8f914E565DcCF46Bd4Ab4A03b',
    // ── API TODO ──────────────────────────────────────────────
    // apy: fetch 30d trailing APY from /api/vaults/monusdc/apy
    // apyHistory: fetch from /api/vaults/monusdc/history?interval=1d&limit=90
    //   each point: { timestamp, sharePrice, tvl }
    apy: null,
    apyHistory: [],
  },
  {
    id: 'monausd',
    name: 'MON / AUSD Delta Neutral',
    tagline: 'Market-making yield with no directional MON exposure (AUSD)',
    description:
      'Same delta-neutral strategy as the MON/USDC vault, but denominated in AUSD — ' +
      'a native Monad stablecoin. Deposit AUSD and earn market-making fees from the ' +
      'Kuru MON/AUSD orderbook.',
    strategy: [
      'Identical mechanics to the MON/USDC vault, operating on the MON/AUSD Kuru market.',
      'AUSD collateral is supplied to Neverland; MON is borrowed and deposited into Kuru.',
      'Delta-neutral: MON long inside Kuru is offset by the Neverland MON borrow.',
    ],
    risks: [
      'Same risks as MON/USDC vault.',
      'Additional AUSD peg risk relative to USD.',
    ],
    baseSymbol: 'MON',
    baseDecimals: 18,
    quoteSymbol: 'AUSD',
    // Placeholder — update once deployed
    quoteAddress: '0x0000000000000000000000000000000000000000',
    quoteDecimals: 6,
    proxyAddress: '0x0000000000000000000000000000000000000000',
    implementationAddress: '0x0000000000000000000000000000000000000000',
    comingSoon: true,
    apy: null,
    apyHistory: [],
  },
]
