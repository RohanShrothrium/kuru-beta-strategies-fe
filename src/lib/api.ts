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
}

export interface SharePriceHistoryResponse {
  SharePricePoint: SharePriceHistoryPoint[]
}

export interface AprSnapshot {
  timestamp: string          // unix seconds as string
  sharePriceE18: string     // share price * 10^18 as string
}

export interface AprResponse {
  latest: AprSnapshot[]
  historical: AprSnapshot[]
  earliest: AprSnapshot[]
}

// ── Normalized Types (for UI consumption) ──────────────────

export interface NormalizedSharePricePoint {
  timestamp: number          // unix seconds
  sharePrice: number         // normalized to human-readable (e.g., 1.002 USDC per share), averaged across vaults at this timestamp
  tvl: number               // in USD, summed across all vaults at this timestamp
}

export interface AprData {
  latest: {
    timestamp: number
    sharePrice: number
  } | null
  historical: {
    timestamp: number
    sharePrice: number
  } | null
  aprPercent: number | null   // calculated APR as percentage
}

export interface NavData {
  timestamp: number
  totalTvl: number           // sum of TVL across all vaults at latest timestamp
  averageSharePrice: number  // average share price across all vaults at latest timestamp
}

// ── GraphQL Query Strings ───────────────────────────────────

const HISTORY_SHARE_PRICE_AND_TVL_QUERY = `
  query HistorySharePriceAndTVL(
    $factoryAddress: String!
    $fromTimestamp: numeric!
    $limit: Int!
  ) {
    SharePricePoint(
      where: {
        vault: { factory: { _eq: $factoryAddress } }
        timestamp: { _gte: $fromTimestamp }
        source: { _eq: "Block" }
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      timestamp
      tvl
      sharePriceE18
    }
  }
`

const CALCULATE_APR_QUERY = `
  query CalculateAPR(
    $factoryAddress: String!
    $fromTimestamp: numeric!
  ) {
    latest: SharePricePoint(
      where: {
        vault: { factory: { _eq: $factoryAddress } }
        sharePriceE18: { _gt: 0 }
      }
      order_by: { timestamp: desc }
      limit: 200
    ) {
      timestamp
      sharePriceE18
    }

    historical: SharePricePoint(
      where: {
        vault: { factory: { _eq: $factoryAddress } }
        timestamp: { _lte: $fromTimestamp }
        sharePriceE18: { _gt: 0 }
      }
      order_by: { timestamp: desc }
      limit: 200
    ) {
      timestamp
      sharePriceE18
    }

    earliest: SharePricePoint(
      where: {
        vault: { factory: { _eq: $factoryAddress } }
        sharePriceE18: { _gt: 0 }
      }
      order_by: { timestamp: asc }
      limit: 200
    ) {
      timestamp
      sharePriceE18
    }
  }
`

const CALCULATE_APR_FOR_VAULT_QUERY = `
  query CalculateAPR(
    $vaultId: String!
    $fromTimestamp: numeric!
  ) {
    latest: SharePricePoint(
      where: { vault_id: { _eq: $vaultId } sharePriceE18: { _gt: 0 } }
      order_by: { timestamp: desc }
      limit: 1
    ) {
      timestamp
      sharePriceE18
    }

    historical: SharePricePoint(
      where: {
        vault_id: { _eq: $vaultId }
        timestamp: { _lte: $fromTimestamp }
        sharePriceE18: { _gt: 0 }
      }
      order_by: { timestamp: desc }
      limit: 1
    ) {
      timestamp
      sharePriceE18
    }

    earliest: SharePricePoint(
      where: { vault_id: { _eq: $vaultId } sharePriceE18: { _gt: 0 } }
      order_by: { timestamp: asc }
      limit: 1
    ) {
      timestamp
      sharePriceE18
    }
  }
`

const FETCH_LATEST_TVL_QUERY = `
  query FetchLatestTVL(
    $factoryAddress: String!
  ) {
    SharePricePoint(
      where: { 
        vault: { factory: { _eq: $factoryAddress } }
        source: { _eq: "Block" }
      }
      order_by: { timestamp: desc }
    ) {
      timestamp
      tvl
      sharePriceE18
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

// Number of evenly-spaced chart points to produce after bucketing
const TARGET_CHART_POINTS = 200
// Approximate snapshot cadence in seconds (one row per vault every block)
const SNAPSHOT_INTERVAL_SECS = 40
// Conservative estimate of vault proxies per factory (used for limit calculation)
const EST_VAULTS_PER_FACTORY = 5
// Hard cap on rows fetched per request
const MAX_FETCH_ROWS = 25000

/**
 * Fetches share price history for all vaults from a factory.
 * Steps:
 *  1. Fetch raw rows DESC (newest first) up to `limit` rows.
 *  2. Group by exact timestamp, average share price and sum TVL across vaults.
 *  3. Bucket the aggregated points into TARGET_CHART_POINTS evenly-spaced
 *     time buckets across the requested window, averaging within each bucket.
 * @param factoryAddress - The factory contract address (0x...)
 * @param fromTimestamp - Start of the time window (unix seconds)
 * @param limit - Row limit for the GraphQL query (caller should size for the window)
 */
export async function fetchSharePriceHistory(
  factoryAddress: string,
  fromTimestamp?: number,
  limit?: number
): Promise<NormalizedSharePricePoint[]> {
  try {
    const startTs = fromTimestamp ?? getTimestampDaysAgo(90)
    const now = Math.floor(Date.now() / 1000)

    // Default limit: enough rows to cover the window with the estimated vault count,
    // fetched newest-first so recent data is always present even if we hit the cap.
    const queryLimit = limit ?? Math.min(
      Math.ceil((now - startTs) / SNAPSHOT_INTERVAL_SECS) * EST_VAULTS_PER_FACTORY,
      MAX_FETCH_ROWS
    )

    const data = await graphqlRequest<SharePriceHistoryResponse>(
      HISTORY_SHARE_PRICE_AND_TVL_QUERY,
      {
        factoryAddress: factoryAddress.toLowerCase(),
        fromTimestamp: startTs,
        limit: queryLimit,
      }
    )

    // ── Step 1: filter zero-price rows ──────────────────────────────────────
    const validPoints = data.SharePricePoint.filter(
      point => parseFloat(point.sharePriceE18) > 0
    )

    // ── Step 2: group by exact timestamp, aggregate across vaults ───────────
    const groupedByTimestamp = new Map<number, {
      tvlSum: number
      sharePriceSum: number
      count: number
    }>()

    for (const point of validPoints) {
      const ts = parseInt(point.timestamp)
      const tvl = parseFloat(point.tvl) / 1e6        // USDC has 6 decimals
      const sharePrice = parseFloat(point.sharePriceE18) / 1e18

      const existing = groupedByTimestamp.get(ts)
      if (existing) {
        existing.tvlSum += tvl
        existing.sharePriceSum += sharePrice
        existing.count += 1
      } else {
        groupedByTimestamp.set(ts, { tvlSum: tvl, sharePriceSum: sharePrice, count: 1 })
      }
    }

    if (groupedByTimestamp.size === 0) return []

    // Sort aggregated points ASC
    const aggregated = Array.from(groupedByTimestamp.entries())
      .map(([ts, agg]) => ({
        timestamp: ts,
        sharePrice: agg.sharePriceSum / agg.count,
        tvl: agg.tvlSum,
      }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // ── Step 3: downsample to TARGET_CHART_POINTS if needed ─────────────────
    // Bucket over the ACTUAL data span, not the full requested window.
    // This ensures all returned rows are distributed across the chart regardless
    // of whether the row-limit only covers a small slice of the requested period.
    if (aggregated.length <= TARGET_CHART_POINTS) {
      return aggregated
    }

    const dataStart = aggregated[0].timestamp
    const dataEnd = aggregated[aggregated.length - 1].timestamp
    const dataRange = dataEnd - dataStart

    if (dataRange <= 0) return aggregated

    const bucketSize = Math.ceil(dataRange / TARGET_CHART_POINTS)

    const buckets = new Map<number, {
      sharePriceSum: number
      tvlSum: number
      count: number
    }>()

    for (const point of aggregated) {
      const bucketIdx = Math.min(
        Math.floor((point.timestamp - dataStart) / bucketSize),
        TARGET_CHART_POINTS - 1
      )
      const existing = buckets.get(bucketIdx)
      if (existing) {
        existing.sharePriceSum += point.sharePrice
        existing.tvlSum += point.tvl
        existing.count += 1
      } else {
        buckets.set(bucketIdx, { sharePriceSum: point.sharePrice, tvlSum: point.tvl, count: 1 })
      }
    }

    // Representative timestamp is the midpoint of each bucket's interval.
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([bucketIdx, agg]) => ({
        timestamp: dataStart + bucketIdx * bucketSize + Math.floor(bucketSize / 2),
        sharePrice: agg.sharePriceSum / agg.count,
        tvl: agg.tvlSum / agg.count,
      }))
  } catch (error) {
    console.error('Error fetching share price history:', error)
    return []
  }
}

/**
 * Groups share price snapshots by timestamp, finds the timestamp with the most
 * vault entries among the most recent snapshots, and returns the average share
 * price across all vaults at that timestamp.
 */
function averageAtMostRecentTimestamp(
  points: AprSnapshot[]
): { timestamp: number; sharePrice: number } | null {
  const validPoints = points.filter(p => parseFloat(p.sharePriceE18) > 0)
  if (validPoints.length === 0) return null

  // Group share prices by timestamp
  const groups = new Map<number, number[]>()
  for (const point of validPoints) {
    const ts = parseInt(point.timestamp)
    const sp = parseFloat(point.sharePriceE18) / 1e18
    const arr = groups.get(ts) ?? []
    arr.push(sp)
    groups.set(ts, arr)
  }

  // Among the 5 most recent timestamps, pick the one with the most vault entries
  // (most complete factory snapshot)
  const sortedTimestamps = Array.from(groups.keys()).sort((a, b) => b - a)
  let bestTs = sortedTimestamps[0]
  let bestCount = groups.get(bestTs)!.length
  for (let i = 1; i < Math.min(5, sortedTimestamps.length); i++) {
    const ts = sortedTimestamps[i]
    const count = groups.get(ts)!.length
    if (count > bestCount) {
      bestTs = ts
      bestCount = count
    }
  }

  const prices = groups.get(bestTs)!
  return {
    timestamp: bestTs,
    sharePrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
  }
}

/**
 * Fetches APR data (latest + historical snapshots) for all vaults from a factory
 * Averages share price across all vaults at each snapshot to produce factory-level APR
 * @param factoryAddress - The factory contract address (0x...)
 * @param fromTimestamp - Start timestamp for historical data (unix seconds)
 */
export async function fetchAprData(
  factoryAddress: string,
  fromTimestamp?: number
): Promise<AprData> {
  try {
    const timestamp = fromTimestamp ?? getTimestampDaysAgo(30)

    const data = await graphqlRequest<AprResponse>(
      CALCULATE_APR_QUERY,
      {
        factoryAddress: factoryAddress.toLowerCase(),
        fromTimestamp: timestamp,
      }
    )

    // Average across all vaults at the most recent snapshot timestamp
    const latest = averageAtMostRecentTimestamp(data.latest)

    // Use historical window first; fall back to earliest available
    const historical =
      averageAtMostRecentTimestamp(data.historical) ??
      averageAtMostRecentTimestamp(data.earliest)

    let aprPercent: number | null = null
    if (latest && historical && historical.sharePrice > 0) {
      const priceRatio = latest.sharePrice / historical.sharePrice
      const timeDiffSeconds = latest.timestamp - historical.timestamp
      const timeDiffYears = timeDiffSeconds / (365.25 * 24 * 60 * 60)
      if (timeDiffYears > 0) {
        aprPercent = ((priceRatio - 1) / timeDiffYears) * 100
      }
    }

    return { latest, historical, aprPercent }
  } catch (error) {
    console.error('Error fetching APR data:', error)
    return { latest: null, historical: null, aprPercent: null }
  }
}

/**
 * Fetches APR data for a single vault by its vault_id.
 * Uses limit: 1 per query — no cross-vault averaging needed.
 * @param vaultId - The vault proxy address used as vault_id (0x...)
 * @param fromTimestamp - Start timestamp for historical comparison (unix seconds)
 */
export async function fetchAprDataForVault(
  vaultId: string,
  fromTimestamp?: number
): Promise<AprData> {
  try {
    const timestamp = fromTimestamp ?? getTimestampDaysAgo(30)

    const data = await graphqlRequest<AprResponse>(
      CALCULATE_APR_FOR_VAULT_QUERY,
      {
        vaultId: vaultId.toLowerCase(),
        fromTimestamp: timestamp,
      }
    )

    const toPoint = (rows: AprSnapshot[]) => {
      const row = rows[0]
      if (!row || parseFloat(row.sharePriceE18) === 0) return null
      return {
        timestamp: parseInt(row.timestamp),
        sharePrice: parseFloat(row.sharePriceE18) / 1e18,
      }
    }

    const latest = toPoint(data.latest)
    const historical = toPoint(data.historical) ?? toPoint(data.earliest)

    let aprPercent: number | null = null
    if (latest && historical && historical.sharePrice > 0) {
      const priceRatio = latest.sharePrice / historical.sharePrice
      const timeDiffSeconds = latest.timestamp - historical.timestamp
      const timeDiffYears = timeDiffSeconds / (365.25 * 24 * 60 * 60)
      if (timeDiffYears > 0) {
        aprPercent = ((priceRatio - 1) / timeDiffYears) * 100
      }
    }

    return { latest, historical, aprPercent }
  } catch (error) {
    console.error('Error fetching APR data for vault:', error)
    return { latest: null, historical: null, aprPercent: null }
  }
}

/**
 * Fetches NAV (sum of TVL) at the latest timestamp for all vaults from a factory
 * @param factoryAddress - The factory contract address (0x...)
 */
export async function fetchNav(
  factoryAddress: string
): Promise<NavData | null> {
  try {
    const data = await graphqlRequest<SharePriceHistoryResponse>(
      FETCH_LATEST_TVL_QUERY,
      {
        factoryAddress: factoryAddress.toLowerCase(),
      }
    )

    if (data.SharePricePoint.length === 0) {
      return null
    }

    // Find the latest timestamp
    const latestTimestamp = Math.max(
      ...data.SharePricePoint.map(point => parseInt(point.timestamp))
    )

    // Filter points at the latest timestamp and where sharePrice > 0
    const latestPoints = data.SharePricePoint.filter(point => {
      const ts = parseInt(point.timestamp)
      const sharePrice = parseFloat(point.sharePriceE18)
      return ts === latestTimestamp && sharePrice > 0
    })

    if (latestPoints.length === 0) {
      return null
    }

    // Sum TVL and calculate average share price
    let totalTvl = 0
    let sharePriceSum = 0

    for (const point of latestPoints) {
      const tvl = parseFloat(point.tvl) / 1e6 // Convert from token units to USD (6 decimals for USDC)
      const sharePrice = parseFloat(point.sharePriceE18) / 1e18 // Convert from E18 to human-readable
      
      totalTvl += tvl
      sharePriceSum += sharePrice
    }

    return {
      timestamp: latestTimestamp,
      totalTvl,
      averageSharePrice: sharePriceSum / latestPoints.length,
    }
  } catch (error) {
    console.error('Error fetching NAV:', error)
    return null
  }
}

/**
 * Helper to calculate time range for historical queries
 */
export function getTimestampDaysAgo(days: number): number {
  return Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60)
}

/**
 * Fetches the current incentive APR for a Merkl campaign opportunity.
 * Returns APR already as a percentage (e.g. 44.3 means 44.3%).
 * @param campaignAddress - The campaign identifier address
 * @param chainId - Chain ID (default 143 for Monad)
 */
export async function fetchMerklCampaignApr(
  campaignAddress: string,
  chainId: number = 143
): Promise<number | null> {
  try {
    const url = `${MERKL_API_BASE}/opportunities?chainId=${chainId}&identifier=${campaignAddress}`
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const apr = data[0]?.apr
    return typeof apr === 'number' ? apr : null
  } catch (error) {
    console.error('Error fetching Merkl campaign APR:', error)
    return null
  }
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
