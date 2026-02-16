import { useReadContract, useReadContracts } from 'wagmi'
import { useAccount } from 'wagmi'
import { VAULT_ABI, ERC20_ABI, type VaultConfig } from '../config/vaults'

export interface VaultData {
  totalAssets: bigint
  totalSupply: bigint
  sharePrice: bigint       // convertToAssets(10**quoteDecimals)
  currentLTV: bigint       // in BPS
  unlockInterval: bigint   // seconds
  // User-specific (undefined when not connected)
  userShares: bigint | undefined
  userQuoteBalance: bigint | undefined
  userQuoteAllowance: bigint | undefined
  lastDepositTime: bigint | undefined
  // Loading / refresh
  isLoading: boolean
  refetch: () => void
}

export function useVaultData(vault: VaultConfig): VaultData {
  const { address } = useAccount()
  const unitShares = BigInt(10 ** vault.quoteDecimals)

  // ── Global reads (always fetch) ───────────────────────────
  const { data: global, isLoading: globalLoading, refetch: refetchGlobal } = useReadContracts({
    contracts: [
      { address: vault.proxyAddress, abi: VAULT_ABI, functionName: 'totalAssets' },
      { address: vault.proxyAddress, abi: VAULT_ABI, functionName: 'totalSupply' },
      {
        address: vault.proxyAddress,
        abi: VAULT_ABI,
        functionName: 'convertToAssets',
        args: [unitShares],
      },
      { address: vault.proxyAddress, abi: VAULT_ABI, functionName: 'currentLTV' },
      { address: vault.proxyAddress, abi: VAULT_ABI, functionName: 'unlockInterval' },
    ],
    query: { refetchInterval: 10_000, staleTime: 5_000 },
  })

  // ── User reads (only when wallet connected) ───────────────
  const {
    data: user,
    isLoading: userLoading,
    refetch: refetchUser,
  } = useReadContracts({
    contracts: [
      {
        address: vault.proxyAddress,
        abi: VAULT_ABI,
        functionName: 'balanceOf',
        args: [address ?? '0x0000000000000000000000000000000000000000'],
      },
      {
        address: vault.quoteAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address ?? '0x0000000000000000000000000000000000000000'],
      },
      {
        address: vault.quoteAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [
          address ?? '0x0000000000000000000000000000000000000000',
          vault.proxyAddress,
        ],
      },
      {
        address: vault.proxyAddress,
        abi: VAULT_ABI,
        functionName: 'lastDepositTime',
        args: [address ?? '0x0000000000000000000000000000000000000000'],
      },
    ],
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
      staleTime: 5_000,
    },
  })

  const g = <T>(i: number): T | undefined =>
    global?.[i]?.status === 'success' ? (global[i].result as T) : undefined

  const u = <T>(i: number): T | undefined =>
    user?.[i]?.status === 'success' ? (user[i].result as T) : undefined

  return {
    totalAssets:   g<bigint>(0) ?? 0n,
    totalSupply:   g<bigint>(1) ?? 0n,
    sharePrice:    g<bigint>(2) ?? unitShares,
    currentLTV:    g<bigint>(3) ?? 0n,
    unlockInterval: g<bigint>(4) ?? 0n,
    userShares:         address ? u<bigint>(0) : undefined,
    userQuoteBalance:   address ? u<bigint>(1) : undefined,
    userQuoteAllowance: address ? u<bigint>(2) : undefined,
    lastDepositTime:    address ? u<bigint>(3) : undefined,
    isLoading: globalLoading || (!!address && userLoading),
    refetch: () => { refetchGlobal(); if (address) refetchUser() },
  }
}

// ── Preview hooks ──────────────────────────────────────────────────────────────

export function usePreviewDeposit(vault: VaultConfig, quoteAmount: bigint) {
  const { data } = useReadContract({
    address: vault.proxyAddress,
    abi: VAULT_ABI,
    functionName: 'previewDeposit',
    args: [quoteAmount],
    query: { enabled: quoteAmount > 0n },
  })
  return data as bigint | undefined
}

export function usePreviewWithdraw(vault: VaultConfig, shares: bigint) {
  const { data } = useReadContract({
    address: vault.proxyAddress,
    abi: VAULT_ABI,
    functionName: 'previewWithdraw',
    args: [shares],
    query: { enabled: shares > 0n },
  })
  return data as bigint | undefined
}

// Returns the { quoteReturned, baseReturned } breakdown for tooltip display.
export function usePreviewWithdrawAmounts(
  vault: VaultConfig,
  shares: bigint,
): { quote: bigint; base: bigint } | undefined {
  const { data } = useReadContract({
    address: vault.proxyAddress,
    abi: VAULT_ABI,
    functionName: 'previewWithdrawAmounts',
    args: [shares],
    query: { enabled: shares > 0n },
  })
  if (!data) return undefined
  const [quote, base] = data as [bigint, bigint]
  return { quote, base }
}
