// ============================================================
// API Client for Kuru Backend
// ============================================================
// Utilities for fetching share price history and APR data
// from the backend REST API

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/rest'

// ── API Response Types ──────────────────────────────────────

export interface SharePriceHistoryPoint {
  timestamp: string          // unix seconds as string
  tvl: string               // in quote token units as string
  sharePriceE18: string     // share price * 10^18 as string
  blockNumber: string
  vault_id: string
  source: string
}

export interface SharePriceHistoryResponse {
  SharePricePoint: SharePriceHistoryPoint[]
}

export interface AprSnapshot {
  timestamp: string          // unix seconds as string
  sharePriceE18: string     // share price * 10^18 as string
  blockNumber: string
}

export interface AprResponse {
  latest: AprSnapshot[]
  historical: AprSnapshot[]
}

// ── Normalized Types (for UI consumption) ──────────────────

export interface NormalizedSharePricePoint {
  timestamp: number          // unix seconds
  sharePrice: number         // normalized to human-readable (e.g., 1.002 USDC per share)
  tvl: number               // in USD
  blockNumber: number
  source: string
}

export interface AprData {
  latest: {
    timestamp: number
    sharePrice: number
    blockNumber: number
  } | null
  historical: {
    timestamp: number
    sharePrice: number
    blockNumber: number
  } | null
  aprPercent: number | null   // calculated APR as percentage
}

// ── API Functions ───────────────────────────────────────────

/**
 * Fetches share price history for a vault
 * @param vaultId - The user's personal vault address (0x...) - This should match the vault_id indexed in the backend
 * @param fromTimestamp - Start timestamp (unix seconds)
 * @param limit - Max number of points to return
 */
export async function fetchSharePriceHistory(
  vaultId: string,
  fromTimestamp?: number,
  limit?: number
): Promise<NormalizedSharePricePoint[]> {
  const params = new URLSearchParams()
  params.append('vaultId', vaultId.toLowerCase())
  if (fromTimestamp) params.append('fromTimestamp', fromTimestamp.toString())
  if (limit) params.append('limit', limit.toString())

  const url = `${API_BASE_URL}/history?${params}`
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch share price history: ${response.statusText}`)
    }
    
    const data: SharePriceHistoryResponse = await response.json()
    
    // Normalize the data for UI consumption
    return data.SharePricePoint.map(point => ({
      timestamp: parseInt(point.timestamp),
      // Convert from E18 to human-readable (divide by 10^18)
      sharePrice: parseFloat(point.sharePriceE18) / 1e18,
      // TVL is in token units (6 decimals for USDC), normalize to USD
      tvl: parseFloat(point.tvl) / 1e6,
      blockNumber: parseInt(point.blockNumber),
      source: point.source,
    }))
  } catch (error) {
    console.error('Error fetching share price history:', error)
    return []
  }
}

/**
 * Fetches APR data (latest + historical snapshots) for a vault
 * @param vaultId - The user's personal vault address (0x...) - This should match the vault_id indexed in the backend
 * @param fromTimestamp - Start timestamp for historical data (unix seconds)
 */
export async function fetchAprData(
  vaultId: string,
  fromTimestamp?: number
): Promise<AprData> {
  const params = new URLSearchParams()
  params.append('vaultId', vaultId.toLowerCase())
  if (fromTimestamp) params.append('fromTimestamp', fromTimestamp.toString())

  const url = `${API_BASE_URL}/apr?${params}`
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch APR data: ${response.statusText}`)
    }
    
    const data: AprResponse = await response.json()
    
    const latest = data.latest[0] ? {
      timestamp: parseInt(data.latest[0].timestamp),
      sharePrice: parseFloat(data.latest[0].sharePriceE18) / 1e18,
      blockNumber: parseInt(data.latest[0].blockNumber),
    } : null

    const historical = data.historical[0] ? {
      timestamp: parseInt(data.historical[0].timestamp),
      sharePrice: parseFloat(data.historical[0].sharePriceE18) / 1e18,
      blockNumber: parseInt(data.historical[0].blockNumber),
    } : null

    // Calculate APR if we have both data points
    let aprPercent: number | null = null
    if (latest && historical && historical.sharePrice > 0) {
      const priceRatio = latest.sharePrice / historical.sharePrice
      const timeDiffSeconds = latest.timestamp - historical.timestamp
      const timeDiffYears = timeDiffSeconds / (365.25 * 24 * 60 * 60)
      
      if (timeDiffYears > 0) {
        // APR = (priceRatio - 1) / timeDiffYears * 100
        aprPercent = ((priceRatio - 1) / timeDiffYears) * 100
      }
    }

    return {
      latest,
      historical,
      aprPercent,
    }
  } catch (error) {
    console.error('Error fetching APR data:', error)
    return {
      latest: null,
      historical: null,
      aprPercent: null,
    }
  }
}

/**
 * Helper to calculate time range for historical queries
 */
export function getTimestampDaysAgo(days: number): number {
  return Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60)
}
