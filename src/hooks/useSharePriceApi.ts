import { useState, useEffect } from 'react'
import {
  fetchSharePriceHistory,
  fetchAprData,
  getTimestampDaysAgo,
  type NormalizedSharePricePoint,
  type AprData,
} from '../lib/api'

// ── Share Price History Hook ────────────────────────────────

export interface UseSharePriceHistoryResult {
  data: NormalizedSharePricePoint[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches and manages share price history for a vault
 * @param vaultId - The user's personal vault address (0x...)
 * @param daysAgo - How many days back to fetch (default: 90)
 * @param limit - Max number of points (default: no limit)
 * @param enabled - Whether to fetch data (default: true)
 */
export function useSharePriceHistory(
  vaultId: string,
  daysAgo: number = 90,
  limit?: number,
  enabled: boolean = true
): UseSharePriceHistoryResult {
  const [data, setData] = useState<NormalizedSharePricePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const fromTimestamp = getTimestampDaysAgo(daysAgo)
        const result = await fetchSharePriceHistory(vaultId, fromTimestamp, limit)
        
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
  }, [vaultId, daysAgo, limit, enabled, refetchTrigger])

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
 * Fetches APR data for a vault and calculates the APR percentage
 * @param vaultId - The user's personal vault address (0x...)
 * @param daysAgo - How far back to compare for APR calculation (default: 30)
 * @param enabled - Whether to fetch data (default: true)
 * @param refetchInterval - Auto-refetch interval in ms (default: 60000 = 1 min)
 */
export function useAprData(
  vaultId: string,
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
    if (!enabled) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const fromTimestamp = getTimestampDaysAgo(daysAgo)
        const result = await fetchAprData(vaultId, fromTimestamp)
        
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
  }, [vaultId, daysAgo, enabled, refetchInterval, refetchTrigger])

  const refetch = () => setRefetchTrigger(prev => prev + 1)

  return { data, isLoading, error, refetch }
}
