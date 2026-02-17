// ============================================================
// Vault Configuration
// ============================================================
// All on-chain addresses for each QuoteOnlyVault deployment.
// Add new vaults here — the UI picks them up automatically.
//
// Architecture: VaultFactory creates EIP-1167 clones — one per
// user. Each user has their own vault address (fetched via
// factory.vaultOf(userAddress)). There is no shared proxy.
//
// APR and share price history are fetched dynamically from the
// backend API endpoints (/api/rest/history and /api/rest/apr)
// ============================================================

export const FACTORY_ABI = [
  // ── Factory actions ────────────────────────────────────────
  {
    name: 'createVault',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'vault', type: 'address' }],
  },
  // ── Factory views ──────────────────────────────────────────
  {
    name: 'vaultOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'vault', type: 'address' }],
  },
  {
    name: 'implementation',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // ── Events ─────────────────────────────────────────────────
  {
    name: 'VaultCreated',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'vault', type: 'address', indexed: true },
    ],
  },
] as const

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
  // Vault-wide Kuru deposit timestamp — controls the withdraw lock.
  // (Per-user vault: only one depositor, so this equals the owner's last deposit time.)
  {
    name: 'lastKuruDepositTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
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
  // ── Execute arbitrary calls ────────────────────────────────
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ name: 'result', type: 'bytes' }],
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

// ── Merkl Distributor ABI ──────────────────────────────────
// ABI for claiming rewards from Merkl distributor contract
export const MERKL_DISTRIBUTOR_ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'users', type: 'address[]' },
      { name: 'tokens', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'proofs', type: 'bytes32[][]' },
    ],
    outputs: [],
  },
] as const

// Merkl distributor contract address on Monad (chain 143)
// Verify this address at: https://app.merkl.xyz/status
// This is the standard Merkl distributor address used across chains
export const MERKL_DISTRIBUTOR_ADDRESS = '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae' as const

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
  // Factory that creates per-user vault clones (replaces shared proxyAddress)
  factoryAddress: `0x${string}`
  // Implementation contract (shared logic for all clones)
  implementationAddress: `0x${string}`
  // Default vault address to show example charts/data (when user hasn't created their vault)
  defaultVaultAddress?: `0x${string}`
  // Merkl opportunity campaign address for incentive APR
  merklCampaignAddress?: string
  comingSoon?: boolean
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
      'Each user owns their own vault — no shared lock contention. Your 4-day unlock is isolated to your deposits only.',
    ],
    risks: [
      'Smart contract risk in QuoteOnlyVault, Kuru, and Neverland.',
      'Oracle risk: positions are priced by the Neverland oracle (RedStone).',
      'LTV drift: rapid MON price moves can widen the hedge before rebalance fires.',
      'Liquidity risk: Kuru withdrawals are subject to a 4-day unlock period.',
      'Borrow rate risk: rising MON borrow rates on Neverland reduce net yield.',
    ],
    baseSymbol: 'MON',
    baseDecimals: 18,
    quoteSymbol: 'USDC',
    quoteAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    quoteDecimals: 6,
    // TODO: update factoryAddress once VaultFactory is deployed (run script/DeployVaultSystem.s.sol)
    factoryAddress: '0xCcb57703b65A8643401b11Cb40878F8cE0d622A3',
    implementationAddress: '0x352cE7130447023e0eF5D039e6E05A38DC781C10',
    defaultVaultAddress: '0x560f2b3c4d56e38b449a3a68be033be21dfc4929',
    merklCampaignAddress: '0xd0F8A6422CcdD812f29D8FB75CF5FCd41483BaDc',
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
      'Smart contract risk in QuoteOnlyVault, Kuru, and Neverland.',
      'Oracle risk: positions are priced by the Neverland oracle (RedStone).',
      'LTV drift: rapid MON price moves can widen the hedge before rebalance fires.',
      'Liquidity risk: Kuru withdrawals are subject to a 4-day unlock period.',
      'Borrow rate risk: rising MON borrow rates on Neverland reduce net yield.',
      'AUSD peg risk: AUSD may trade at a discount or premium to USD.',
    ],
    baseSymbol: 'MON',
    baseDecimals: 18,
    quoteSymbol: 'AUSD',
    // Placeholder — update once deployed
    quoteAddress: '0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a',
    quoteDecimals: 6,
    factoryAddress: '0x79B99A1e9fF8F16a198Dac4b42Fd164680487062',
    implementationAddress: '0x27F27Da576b1E0f8720d98A989a1877d68e9EFCC',
    defaultVaultAddress: '0x7a353534c71d5ac9940f84a3e0356b421d25591d',
    merklCampaignAddress: '0x4869A4C7657cEf5E5496C9cE56DDe4CD593e4923',
    comingSoon: false,
  },
  {
    id: 'monusdc-staging',
    name: 'MON / USDC Delta Neutral (Staging)',
    tagline: 'Market-making yield with no directional MON exposure — HIGH RISK TESTING',
    description:
      'Staging version of the MON/USDC vault for testing new strategies. ' +
      'Deposit USDC and earn market-making fees from the Kuru MON/USDC orderbook. ' +
      'The vault borrows MON from Neverland (Aave V3 fork) to construct a delta-neutral ' +
      'position — your MON long inside Kuru is exactly offset by the Neverland borrow, ' +
      'leaving you with pure USDC-denominated yield. ' +
      '⚠️ WARNING: This is a high-risk staging deployment for testing purposes only.',
    strategy: [
      'Your USDC is split: ~50% stays as Aave collateral, ~50% goes into the Kuru MON/USDC market-making vault.',
      'MON is borrowed from Neverland at ~50% LTV against the collateral and deposited alongside the USDC into Kuru.',
      'Kuru earns spread and fee revenue by providing liquidity around the mid-price.',
      'The Neverland borrow precisely offsets the MON long in Kuru, making returns delta-neutral to MON price.',
      'Each user owns their own vault — no shared lock contention. Your 4-day unlock is isolated to your deposits only.',
    ],
    risks: [
      '⚠️ HIGH RISK: This is a staging deployment for testing — use at your own risk.',
      'Smart contract risk in QuoteOnlyVault, Kuru, and Neverland.',
      'Oracle risk: positions are priced by the Neverland oracle (RedStone).',
      'LTV drift: rapid MON price moves can widen the hedge before rebalance fires.',
      'Liquidity risk: Kuru withdrawals are subject to a 4-day unlock period.',
      'Borrow rate risk: rising MON borrow rates on Neverland reduce net yield.',
      'Testing risk: This deployment may contain untested code or experimental features.',
    ],
    baseSymbol: 'MON',
    baseDecimals: 18,
    quoteSymbol: 'USDC',
    quoteAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    quoteDecimals: 6,
    factoryAddress: '0x27d7f49aB3086Ef6d247a9f33C611b51E18D5153',
    implementationAddress: '0x49826A34f102a2cCf3e4190f404b4AC009B44a80',
  },
]
