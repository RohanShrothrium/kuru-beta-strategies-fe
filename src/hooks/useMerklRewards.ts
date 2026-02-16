// ============================================================
// Merkl Rewards Hook
// ============================================================
// Hook to fetch and manage Merkl rewards data for a user's vault

import { useState, useEffect } from 'react'
import { fetchMerklRewards, type NormalizedMerklReward } from '../lib/api'

interface UseMerklRewardsResult {
  rewards: NormalizedMerklReward[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches Merkl rewards for a user's vault address
 * @param vaultAddress - The user's vault address (proxy)
 * @param chainId - The chain ID (default: 143 for Monad)
 * @param enabled - Whether to fetch data (default: true)
 */
export function useMerklRewards(
  vaultAddress: string | undefined,
  chainId: number = 143,
  enabled: boolean = true
): UseMerklRewardsResult {
  const [rewards, setRewards] = useState<NormalizedMerklReward[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    if (!enabled || !vaultAddress) {
      setRewards([])
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const data = await fetchMerklRewards(vaultAddress, chainId)
        
        if (!cancelled) {
          setRewards(data)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch Merkl rewards'))
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [vaultAddress, chainId, enabled, refetchTrigger])

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1)
  }

  return {
    rewards,
    isLoading,
    error,
    refetch,
  }
}
