// ============================================================
// API Client for Kuru Backend
// ============================================================
// Utilities for fetching share price history and APR data
// from the backend GraphQL API

const GRAPHQL_API_URL = import.meta.env.VITE_GRAPHQL_API_URL || 'http://localhost:8080/v1/graphql'

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
  earliest: AprSnapshot[]
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

// ── GraphQL Query Strings ───────────────────────────────────

const HISTORY_SHARE_PRICE_AND_TVL_QUERY = `
  query HistorySharePriceAndTVL(
    $vaultId: String!
    $fromTimestamp: numeric!
    $limit: Int = 1000
  ) {
    SharePricePoint(
      where: {
        vault_id: { _eq: $vaultId }
        timestamp: { _gte: $fromTimestamp }
        source: {_eq: "Block"}
      }
      limit: $limit
      order_by: { timestamp: asc }
    ) {
      timestamp
      tvl
      sharePriceE18
      blockNumber
      vault_id
      source
    }
  }
`

const CALCULATE_APR_QUERY = `
  query CalculateAPR(
    $vaultId: String!
    $fromTimestamp: numeric!
  ) {
    latest: SharePricePoint(
      where: { vault_id: { _eq: $vaultId } }
      order_by: { timestamp: desc }
      limit: 1
    ) {
      timestamp
      sharePriceE18
      blockNumber
    }
    
    historical: SharePricePoint(
      where: { 
        vault_id: { _eq: $vaultId }
        timestamp: { _lte: $fromTimestamp }
      }
      order_by: { timestamp: desc }
      limit: 1
    ) {
      timestamp
      sharePriceE18
      blockNumber
    }
    
    earliest: SharePricePoint(
      where: { vault_id: { _eq: $vaultId } }
      order_by: { timestamp: asc }
      limit: 1
    ) {
      timestamp
      sharePriceE18
      blockNumber
    }
  }
`

// ── GraphQL Helper Functions ────────────────────────────────

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: Record<string, unknown>
  }>
}

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GRAPHQL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`)
  }

  const result: GraphQLResponse<T> = await response.json()

  if (result.errors && result.errors.length > 0) {
    throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`)
  }

  if (!result.data) {
    throw new Error('GraphQL response missing data')
  }

  return result.data
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
  try {
    // Default fromTimestamp to 90 days ago if not provided
    const timestamp = fromTimestamp ?? getTimestampDaysAgo(90)
    const queryLimit = limit ?? 1000

    const data = await graphqlRequest<SharePriceHistoryResponse>(
      HISTORY_SHARE_PRICE_AND_TVL_QUERY,
      {
        vaultId: vaultId.toLowerCase(),
        fromTimestamp: timestamp,
        limit: queryLimit,
      }
    )
    
    // Filter out entries where sharePrice is 0, then normalize the data for UI consumption
    return data.SharePricePoint
      .filter(point => {
        const sharePrice = parseFloat(point.sharePriceE18)
        return sharePrice > 0
      })
      .map(point => ({
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
  try {
    // Default fromTimestamp to 30 days ago if not provided
    const timestamp = fromTimestamp ?? getTimestampDaysAgo(30)

    const data = await graphqlRequest<AprResponse>(
      CALCULATE_APR_QUERY,
      {
        vaultId: vaultId.toLowerCase(),
        fromTimestamp: timestamp,
      }
    )
    
    // Filter out entries where sharePrice is 0
    const latestPoint = data.latest.find(point => parseFloat(point.sharePriceE18) > 0)
    const latest = latestPoint ? {
      timestamp: parseInt(latestPoint.timestamp),
      sharePrice: parseFloat(latestPoint.sharePriceE18) / 1e18,
      blockNumber: parseInt(latestPoint.blockNumber),
    } : null

    // historical returns either the historical point (if available) or the earliest point (as fallback)
    // Filter out entries where sharePrice is 0
    const historicalPoint = data.historical.find(point => parseFloat(point.sharePriceE18) > 0)
    const earliestPoint = data.earliest.find(point => parseFloat(point.sharePriceE18) > 0)
    const historical = historicalPoint ? {
      timestamp: parseInt(historicalPoint.timestamp),
      sharePrice: parseFloat(historicalPoint.sharePriceE18) / 1e18,
      blockNumber: parseInt(historicalPoint.blockNumber),
    } : (earliestPoint ? {
      timestamp: parseInt(earliestPoint.timestamp),
      sharePrice: parseFloat(earliestPoint.sharePriceE18) / 1e18,
      blockNumber: parseInt(earliestPoint.blockNumber),
    } : null)

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

// ── Merkl API Types ─────────────────────────────────────────

export interface MerklToken {
  chainId: number
  address: string
  decimals: number
  symbol: string
  price: number
}

export interface MerklRewardBreakdown {
  root: string
  distributionChainId: number
  reason: string
  amount: string
  claimed: string
  pending: string
  campaignId: string
}

export interface MerklReward {
  root: string
  distributionChainId: number
  recipient: string
  amount: string
  claimed: string
  pending: string
  proofs: string[]
  token: MerklToken
  breakdowns: MerklRewardBreakdown[]
}

export interface MerklChainInfo {
  endOfDisputePeriod: number
  explorers: Array<{
    chainId: number
    id: string
    type: string
    url: string
  }>
  icon: string
  id: number
  liveCampaigns: number
  name: string
}

export interface MerklChainRewards {
  chain: MerklChainInfo
  rewards: MerklReward[]
}

export interface MerklRewardsResponse {
  chains: MerklChainRewards[]
}

// Normalized types for UI
export interface NormalizedMerklReward {
  tokenSymbol: string
  tokenAddress: string
  tokenPrice: number
  tokenDecimals: number
  totalAmount: number // in human-readable units
  totalClaimed: number
  totalPending: number
  totalUsdValue: number
  claimedUsdValue: number
  pendingUsdValue: number
  campaigns: Array<{
    campaignId: string
    reason: string
    amount: number
    claimed: number
    pending: number
  }>
  // Raw claim data for executing claims
  claimData: {
    recipient: string
    amount: string // total amount in Merkle tree (raw amount in wei)
    claimableAmount: string // claimable amount = amount - claimed (raw amount in wei)
    proofs: string[]
  }
}

// ── Merkl API Functions ─────────────────────────────────────

const MERKL_API_BASE = 'https://api.merkl.xyz/v4'

/**
 * Fetches Merkl rewards for a user address on a specific chain
 * @param userAddress - The user's vault address (proxy)
 * @param chainId - The chain ID (143 for Monad)
 */
export async function fetchMerklRewards(
  userAddress: string,
  chainId: number = 143
): Promise<NormalizedMerklReward[]> {
  if (!userAddress) {
    return []
  }

  const url = `${MERKL_API_BASE}/users/${userAddress}/rewards?chainId=${chainId}&reloadChainId=${chainId}`
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch Merkl rewards: ${response.statusText}`)
    }
    
    const data: MerklChainRewards[] = await response.json()
    
    // Normalize the data for UI consumption
    const normalized: NormalizedMerklReward[] = []
    
    for (const chainData of data) {
      for (const reward of chainData.rewards) {
        const token = reward.token
        const decimals = token.decimals
        const divisor = Math.pow(10, decimals)
        
        // Convert from wei-like units to human-readable
        const totalAmount = parseFloat(reward.amount) / divisor
        const totalClaimed = parseFloat(reward.claimed) / divisor
        const totalPending = parseFloat(reward.pending) / divisor
        
        // Calculate USD values
        const totalUsdValue = totalAmount * token.price
        const claimedUsdValue = totalClaimed * token.price
        const pendingUsdValue = totalPending * token.price
        
        // Process campaigns
        const campaigns = reward.breakdowns.map(breakdown => ({
          campaignId: breakdown.campaignId,
          reason: breakdown.reason,
          amount: parseFloat(breakdown.amount) / divisor,
          claimed: parseFloat(breakdown.claimed) / divisor,
          pending: parseFloat(breakdown.pending) / divisor,
        }))
        
        // Calculate claimable amount
        const amountBigInt = BigInt(reward.amount)
        const claimedBigInt = BigInt(reward.claimed)
        const claimableAmountBigInt = amountBigInt - claimedBigInt
        
        // Debug logging
        console.log('Merkl Reward Debug:', {
          token: token.symbol,
          recipient: reward.recipient,
          rawAmount: reward.amount,
          rawClaimed: reward.claimed,
          rawPending: reward.pending,
          amountBigInt: amountBigInt.toString(),
          claimedBigInt: claimedBigInt.toString(),
          claimableAmountBigInt: claimableAmountBigInt.toString(),
          totalAmount,
          totalClaimed,
          totalPending,
        })
        
        normalized.push({
          tokenSymbol: token.symbol,
          tokenAddress: token.address,
          tokenPrice: token.price,
          tokenDecimals: decimals,
          totalAmount,
          totalClaimed,
          totalPending,
          totalUsdValue,
          claimedUsdValue,
          pendingUsdValue,
          campaigns,
          claimData: {
            recipient: reward.recipient,
            amount: reward.amount, // total amount in Merkle tree
            claimableAmount: claimableAmountBigInt.toString(), // amount - claimed
            proofs: reward.proofs,
          },
        })
      }
    }
    
    return normalized
  } catch (error) {
    console.error('Error fetching Merkl rewards:', error)
    return []
  }
}
