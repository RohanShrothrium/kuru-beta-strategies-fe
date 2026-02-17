import { useState, useEffect } from 'react'
import {
  fetchSharePriceHistory,
  fetchAprData,
  fetchAprDataForVault,
  fetchMerklCampaignApr,
  fetchNav,
  getTimestampDaysAgo,
  type NormalizedSharePricePoint,
  type AprData,
  type NavData,
} from '../lib/api'

// Must stay in sync with the constants in api.ts
const SNAPSHOT_INTERVAL_SECS = 40
const EST_VAULTS_PER_FACTORY = 5
const MAX_FETCH_ROWS = 25000

// ── Share Price History Hook ────────────────────────────────

export interface UseSharePriceHistoryResult {
  data: NormalizedSharePricePoint[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches and manages share price history for all vaults from a factory
 * @param factoryAddress - The factory contract address (0x...)
 * @param daysAgo - How many days back to fetch (default: 90)
 * @param limit - Max number of points (default: no limit)
 * @param enabled - Whether to fetch data (default: true)
 */
export function useSharePriceHistory(
  factoryAddress: string,
  daysAgo: number = 90,
  limit?: number,
  enabled: boolean = true
): UseSharePriceHistoryResult {
  const [data, setData] = useState<NormalizedSharePricePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    if (!enabled || !factoryAddress) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const fromTimestamp = getTimestampDaysAgo(daysAgo)
        // Compute row limit sized to cover the full time window newest-first.
        // Caller can override via the `limit` prop.
        const computedLimit = limit ?? Math.min(
          Math.ceil(daysAgo * 86400 / SNAPSHOT_INTERVAL_SECS) * EST_VAULTS_PER_FACTORY,
          MAX_FETCH_ROWS
        )
        const result = await fetchSharePriceHistory(factoryAddress, fromTimestamp, computedLimit)

        if (!cancelled) {
          setData(result)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [factoryAddress, daysAgo, limit, enabled, refetchTrigger])

  const refetch = () => setRefetchTrigger(prev => prev + 1)

  return { data, isLoading, error, refetch }
}

// ── APR Data Hook ───────────────────────────────────────────

export interface UseAprDataResult {
  data: AprData
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches APR data for all vaults from a factory and calculates the APR percentage
 * @param factoryAddress - The factory contract address (0x...)
 * @param daysAgo - How far back to compare for APR calculation (default: 30)
 * @param enabled - Whether to fetch data (default: true)
 * @param refetchInterval - Auto-refetch interval in ms (default: 60000 = 1 min)
 */
export function useAprData(
  factoryAddress: string,
  daysAgo: number = 30,
  enabled: boolean = true,
  refetchInterval: number = 60_000
): UseAprDataResult {
  const [data, setData] = useState<AprData>({
    latest: null,
    historical: null,
    aprPercent: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    if (!enabled || !factoryAddress) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const fromTimestamp = getTimestampDaysAgo(daysAgo)
        const result = await fetchAprData(factoryAddress, fromTimestamp)
        
        if (!cancelled) {
          setData(result)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setIsLoading(false)
        }
      }
    }

    fetchData()

    // Set up auto-refetch interval
    const intervalId = setInterval(() => {
      setRefetchTrigger(prev => prev + 1)
    }, refetchInterval)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [factoryAddress, daysAgo, enabled, refetchInterval, refetchTrigger])

  const refetch = () => setRefetchTrigger(prev => prev + 1)

  return { data, isLoading, error, refetch }
}

// ── APR Data Hook (single vault) ────────────────────────────

/**
 * Fetches APR data for a specific vault proxy address (not factory-averaged)
 * @param vaultAddress - The vault proxy address (0x...)
 * @param daysAgo - How far back to compare for APR calculation (default: 30)
 * @param enabled - Whether to fetch data (default: true)
 */
export function useAprDataForVault(
  vaultAddress: string | undefined,
  daysAgo: number = 30,
  enabled: boolean = true
): UseAprDataResult {
  const [data, setData] = useState<AprData>({
    latest: null,
    historical: null,
    aprPercent: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    if (!enabled || !vaultAddress) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const fromTimestamp = getTimestampDaysAgo(daysAgo)
        const result = await fetchAprDataForVault(vaultAddress, fromTimestamp)

        if (!cancelled) {
          setData(result)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [vaultAddress, daysAgo, enabled, refetchTrigger])

  const refetch = () => setRefetchTrigger(prev => prev + 1)

  return { data, isLoading, error, refetch }
}

// ── NAV Data Hook ───────────────────────────────────────────

export interface UseNavDataResult {
  data: NavData | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches NAV data (total TVL and average share price) for all vaults from a factory
 * @param factoryAddress - The factory contract address (0x...)
 * @param enabled - Whether to fetch data (default: true)
 * @param refetchInterval - Auto-refetch interval in ms (default: 60_000 = 1 min)
 */
export function useNavData(
  factoryAddress: string,
  enabled: boolean = true,
  refetchInterval: number = 60_000
): UseNavDataResult {
  const [data, setData] = useState<NavData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    if (!enabled || !factoryAddress) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const result = await fetchNav(factoryAddress)
        
        if (!cancelled) {
          setData(result)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setIsLoading(false)
        }
      }
    }

    fetchData()

    // Set up auto-refetch interval
    const intervalId = setInterval(() => {
      setRefetchTrigger(prev => prev + 1)
    }, refetchInterval)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [factoryAddress, enabled, refetchInterval, refetchTrigger])

  const refetch = () => setRefetchTrigger(prev => prev + 1)

  return { data, isLoading, error, refetch }
}

// ── Merkl Campaign APR Hook ──────────────────────────────────

/**
 * Fetches the current incentive APR for a Merkl campaign opportunity.
 * @param campaignAddress - The Merkl campaign identifier address
 * @param chainId - Chain ID (default 143 for Monad)
 */
export function useMerklCampaignApr(
  campaignAddress: string | undefined,
  chainId: number = 143
): { aprPercent: number | null; isLoading: boolean } {
  const [aprPercent, setAprPercent] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!campaignAddress) return
    let cancelled = false
    setIsLoading(true)
    fetchMerklCampaignApr(campaignAddress, chainId).then(apr => {
      if (!cancelled) {
        setAprPercent(apr)
        setIsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [campaignAddress, chainId])

  return { aprPercent, isLoading }
}
