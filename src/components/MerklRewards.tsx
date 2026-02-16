// ============================================================
// Merkl Rewards Display Component
// ============================================================
// Displays Merkl rewards earned by the user's vault

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { encodeFunctionData } from 'viem'
import toast from 'react-hot-toast'
import { useMerklRewards } from '../hooks/useMerklRewards'
import { type NormalizedMerklReward } from '../lib/api'
import { VAULT_ABI, MERKL_DISTRIBUTOR_ABI, MERKL_DISTRIBUTOR_ADDRESS } from '../config/vaults'

interface Props {
  vaultAddress: string | undefined
  chainId?: number
}

export function MerklRewards({ vaultAddress, chainId = 143 }: Props) {
  const { rewards, isLoading, error } = useMerklRewards(vaultAddress, chainId, !!vaultAddress)

  if (!vaultAddress) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Merkl Rewards</h3>
        <p className="text-sm text-zinc-500">
          Create your vault to start earning Merkl rewards
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Merkl Rewards</h3>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Merkl Rewards</h3>
        <p className="text-sm text-red-400">
          Failed to load rewards. Please try again later.
        </p>
      </div>
    )
  }

  if (rewards.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Merkl Rewards</h3>
        <p className="text-sm text-zinc-500">
          No rewards found for this vault yet. Keep providing liquidity to earn rewards!
        </p>
      </div>
    )
  }

  // Calculate total USD value across all rewards
  const totalUsdValue = rewards.reduce((sum, r) => sum + r.totalUsdValue, 0)
  const totalPendingUsdValue = rewards.reduce((sum, r) => sum + r.pendingUsdValue, 0)
  const totalClaimedUsdValue = rewards.reduce((sum, r) => sum + r.claimedUsdValue, 0)

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Merkl Rewards</h3>
      </div>

      {/* Summary stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard
          label="Total Value"
          value={`$${totalUsdValue.toFixed(2)}`}
          accent
        />
        <StatCard
          label="Pending"
          value={`$${totalPendingUsdValue.toFixed(2)}`}
        />
        <StatCard
          label="Claimed"
          value={`$${totalClaimedUsdValue.toFixed(2)}`}
        />
      </div>

      {/* Individual rewards by token */}
      <div className="space-y-3">
        {rewards.map((reward) => (
          <RewardCard key={reward.tokenAddress} reward={reward} vaultAddress={vaultAddress!} />
        ))}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={[
          'mt-1 text-sm font-semibold',
          accent ? 'text-accent' : 'text-white',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

function RewardCard({ reward, vaultAddress }: { reward: NormalizedMerklReward; vaultAddress: string }) {
  const { address } = useAccount()
  const [isClaiming, setIsClaiming] = useState(false)
  
  const { writeContract, data: txHash, error: writeError, reset } = useWriteContract()
  
  const { isSuccess: isTxSuccess, isLoading: isTxPending } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && isClaiming) {
      setIsClaiming(false)
      toast.dismiss('claim-tx')
      toast.success(`Successfully claimed ${reward.totalPending.toFixed(4)} ${reward.tokenSymbol}!`)
      reset()
    }
  }, [isTxSuccess, isClaiming, reward.totalPending, reward.tokenSymbol, reset])

  // Handle transaction error
  useEffect(() => {
    if (writeError && isClaiming) {
      setIsClaiming(false)
      toast.dismiss('claim-tx')
      toast.error('Claim failed. Please try again.')
      console.error('Claim error:', writeError)
      reset()
    }
  }, [writeError, isClaiming, reset])

  // Calculate claimable amount (amount - claimed) in human-readable format
  const claimableAmountRaw = BigInt(reward.claimData.claimableAmount)
  const claimableAmountHuman = claimableAmountRaw / BigInt(10 ** reward.tokenDecimals)

  const handleClaim = async () => {
    if (!address || claimableAmountRaw === 0n) {
      toast.error('No claimable rewards available')
      return
    }

    setIsClaiming(true)

    try {

      // Prepare claim parameters according to Merkl API documentation
      // Use vaultAddress as recipient since rewards are earned by the vault
      const users = [vaultAddress as `0x${string}`]
      const tokens = [reward.tokenAddress as `0x${string}`]
      const amounts = [claimableAmountRaw]
      // proofs is bytes32[][] - array of arrays, one array per claim
      const proofs = [reward.claimData.proofs.map(p => p as `0x${string}`)]

      console.log('Claim parameters:', {
        users,
        tokens,
        amounts: amounts.map(a => a.toString()),
        claimableAmount: claimableAmountRaw.toString(),
        proofsCount: proofs[0].length,
        proofsSample: proofs[0].slice(0, 2),
      })

      // Encode the Merkl claim function call
      // Reference: https://docs.merkl.xyz/integrate-merkl/app
      const claimCallData = encodeFunctionData({
        abi: MERKL_DISTRIBUTOR_ABI,
        functionName: 'claim',
        args: [users, tokens, amounts, proofs],
      })

      console.log('Encoded claim data:', {
        calldata: claimCallData,
        target: MERKL_DISTRIBUTOR_ADDRESS,
        vaultAddress,
      })

      // Execute the claim through the vault's execute function
      writeContract({
        address: vaultAddress as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'execute',
        args: [
          MERKL_DISTRIBUTOR_ADDRESS,  // target
          0n,                         // value (no ETH sent)
          claimCallData,              // data
        ],
      })

      toast.loading('Claiming rewards...', { id: 'claim-tx' })
    } catch (error) {
      setIsClaiming(false)
      toast.dismiss('claim-tx')
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to initiate claim: ${errorMessage}`)
      
      console.error('Claim error details:', {
        error,
        errorMessage,
        reward: {
          token: reward.tokenSymbol,
          address: reward.tokenAddress,
          pending: reward.totalPending,
          claimData: reward.claimData,
        },
      })
    }
  }

  const isProcessing = isClaiming || isTxPending
  const canClaim = claimableAmountRaw > 0n && !isProcessing

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      {/* Token header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-white">
            {reward.tokenSymbol}
          </span>
          <span className="text-xs text-zinc-500">
            ${reward.tokenPrice.toFixed(4)}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-white">
            {reward.totalAmount.toFixed(2)} {reward.tokenSymbol}
          </div>
          <div className="text-xs text-zinc-500">
            ${reward.totalUsdValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>Claimed: {reward.totalAmount > 0 ? ((reward.totalClaimed / reward.totalAmount) * 100).toFixed(1) : '0.0'}%</span>
          <span>Pending: {reward.totalAmount > 0 ? ((reward.totalPending / reward.totalAmount) * 100).toFixed(1) : '0.0'}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-accent"
            style={{
              width: reward.totalAmount > 0 ? `${(reward.totalClaimed / reward.totalAmount) * 100}%` : '0%',
            }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Claimed</span>
          <span className="font-mono text-zinc-400">
            {reward.totalClaimed.toFixed(4)} {reward.tokenSymbol}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Pending</span>
          <span className="font-mono text-zinc-400">
            {reward.totalPending.toFixed(4)} {reward.tokenSymbol}
            <span className="ml-1 text-zinc-600">(next update)</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Claimable</span>
          <span className="font-mono text-accent">
            {Number(claimableAmountHuman).toFixed(4)} {reward.tokenSymbol}
          </span>
        </div>
        {claimableAmountRaw === 0n && reward.totalPending > 0 && (
          <div className="mt-2 rounded bg-zinc-800/50 px-2 py-1 text-xs text-zinc-400">
            ℹ️ Pending rewards will become claimable after the next Merkle tree update
          </div>
        )}
      </div>

      {/* Campaign count & Claim button */}
      <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
        <div className="flex-1">
          {reward.campaigns.length > 0 && (
            <div className="text-xs text-zinc-500">
              {reward.campaigns.length} campaign{reward.campaigns.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        {claimableAmountRaw > 0n && (
          <button
            onClick={handleClaim}
            disabled={!canClaim}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              canClaim
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'cursor-not-allowed bg-zinc-800 text-zinc-500',
            ].join(' ')}
          >
            {isProcessing ? (
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Claiming...
              </span>
            ) : (
              `Claim ${Number(claimableAmountHuman).toFixed(4)} ${reward.tokenSymbol}`
            )}
          </button>
        )}
      </div>
    </div>
  )
}
