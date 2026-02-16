import { useReadContract, useReadContracts } from 'wagmi'
import { useAccount } from 'wagmi'
import { VAULT_ABI, FACTORY_ABI, ERC20_ABI, type VaultConfig } from '../config/vaults'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export interface VaultData {
  totalAssets: bigint
  totalSupply: bigint
  sharePrice: bigint          // convertToAssets(10**quoteDecimals)
  currentLTV: bigint          // in BPS
  unlockInterval: bigint      // seconds
  lastKuruDepositTime: bigint // vault-wide Kuru deposit lock timestamp
  // User-specific (undefined when not connected or no vault)
  userShares: bigint | undefined
  userQuoteBalance: bigint | undefined
  userQuoteAllowance: bigint | undefined
  // Loading / refresh
  isLoading: boolean
  refetch: () => void
}

// ── Per-user vault lookup ───────────────────────────────────────────────────────

export interface UserVaultState {
  userVaultAddress: `0x${string}` | undefined
  hasVault: boolean
  isLoading: boolean
  refetch: () => void
}

/** Reads factory.vaultOf(connectedAddress) to find the user's personal vault clone. */
export function useUserVault(vault: VaultConfig): UserVaultState {
  const { address } = useAccount()

  const { data, isLoading, refetch } = useReadContract({
    address: vault.factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'vaultOf',
    args: [address ?? ZERO_ADDRESS],
    query: {
      enabled: !!address,
      refetchInterval: 5_000,
      staleTime: 3_000,
    },
  })

  const raw = data as `0x${string}` | undefined
  const hasVault = !!raw && raw !== ZERO_ADDRESS

  return {
    userVaultAddress: hasVault ? raw : undefined,
    hasVault,
    isLoading: !!address && isLoading,
    refetch,
  }
}

// ── Vault data (reads from the user's personal vault clone) ────────────────────

/**
 * Fetches all vault metrics and user state from the given personal vault clone.
 * When userVaultAddress is undefined (no vault yet) all numeric fields return 0n
 * and user fields return undefined.
 */
export function useVaultData(vault: VaultConfig, userVaultAddress?: `0x${string}`): VaultData {
  const { address } = useAccount()
  const unitShares = BigInt(10 ** vault.quoteDecimals)

  const hasVault = !!userVaultAddress

  // ── Vault reads (only when a personal vault exists) ───────
  const { data: global, isLoading: globalLoading, refetch: refetchGlobal } = useReadContracts({
    contracts: [
      { address: userVaultAddress!, abi: VAULT_ABI, functionName: 'totalAssets' },
      { address: userVaultAddress!, abi: VAULT_ABI, functionName: 'totalSupply' },
      {
        address: userVaultAddress!,
        abi: VAULT_ABI,
        functionName: 'convertToAssets',
        args: [unitShares],
      },
      { address: userVaultAddress!, abi: VAULT_ABI, functionName: 'currentLTV' },
      { address: userVaultAddress!, abi: VAULT_ABI, functionName: 'unlockInterval' },
      { address: userVaultAddress!, abi: VAULT_ABI, functionName: 'lastKuruDepositTime' },
    ],
    query: {
      enabled: hasVault,
      refetchInterval: 10_000,
      staleTime: 5_000,
    },
  })

  // ── User reads (only when wallet connected and vault exists) ──
  const {
    data: user,
    isLoading: userLoading,
    refetch: refetchUser,
  } = useReadContracts({
    contracts: [
      {
        address: userVaultAddress!,
        abi: VAULT_ABI,
        functionName: 'balanceOf',
        args: [address ?? ZERO_ADDRESS],
      },
      {
        address: vault.quoteAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address ?? ZERO_ADDRESS],
      },
      {
        address: vault.quoteAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address ?? ZERO_ADDRESS, userVaultAddress ?? ZERO_ADDRESS],
      },
    ],
    query: {
      enabled: !!address && hasVault,
      refetchInterval: 10_000,
      staleTime: 5_000,
    },
  })

  const g = <T>(i: number): T | undefined =>
    global?.[i]?.status === 'success' ? (global[i].result as T) : undefined

  const u = <T>(i: number): T | undefined =>
    user?.[i]?.status === 'success' ? (user[i].result as T) : undefined

  return {
    totalAssets:        g<bigint>(0) ?? 0n,
    totalSupply:        g<bigint>(1) ?? 0n,
    sharePrice:         g<bigint>(2) ?? unitShares,
    currentLTV:         g<bigint>(3) ?? 0n,
    unlockInterval:     g<bigint>(4) ?? 0n,
    lastKuruDepositTime: g<bigint>(5) ?? 0n,
    userShares:         address && hasVault ? u<bigint>(0) : undefined,
    userQuoteBalance:   address ? u<bigint>(1) : undefined,
    userQuoteAllowance: address && hasVault ? u<bigint>(2) : undefined,
    isLoading: (hasVault && globalLoading) || (!!address && hasVault && userLoading),
    refetch: () => { refetchGlobal(); if (address) refetchUser() },
  }
}

// ── Preview hooks ──────────────────────────────────────────────────────────────

export function usePreviewDeposit(
  userVaultAddress: `0x${string}` | undefined,
  vault: VaultConfig,
  quoteAmount: bigint,
) {
  const { data } = useReadContract({
    address: userVaultAddress!,
    abi: VAULT_ABI,
    functionName: 'previewDeposit',
    args: [quoteAmount],
    query: { enabled: !!userVaultAddress && quoteAmount > 0n },
  })
  return data as bigint | undefined
}

export function usePreviewWithdraw(
  userVaultAddress: `0x${string}` | undefined,
  vault: VaultConfig,
  shares: bigint,
) {
  const { data } = useReadContract({
    address: userVaultAddress!,
    abi: VAULT_ABI,
    functionName: 'previewWithdraw',
    args: [shares],
    query: { enabled: !!userVaultAddress && shares > 0n },
  })
  return data as bigint | undefined
}

// Returns the { quoteReturned, baseReturned } breakdown for tooltip display.
export function usePreviewWithdrawAmounts(
  userVaultAddress: `0x${string}` | undefined,
  vault: VaultConfig,
  shares: bigint,
): { quote: bigint; base: bigint } | undefined {
  const { data } = useReadContract({
    address: userVaultAddress!,
    abi: VAULT_ABI,
    functionName: 'previewWithdrawAmounts',
    args: [shares],
    query: { enabled: !!userVaultAddress && shares > 0n },
  })
  if (!data) return undefined
  const [quote, base] = data as [bigint, bigint]
  return { quote, base }
}
