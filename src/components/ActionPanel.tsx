import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import toast from 'react-hot-toast'
import { parseEventLogs, maxUint256 } from 'viem'
import { type VaultConfig, VAULT_ABI, ERC20_ABI } from '../config/vaults'
import { type VaultData, usePreviewDeposit, usePreviewWithdraw, usePreviewWithdrawAmounts } from '../hooks/useVaultData'
import { formatShares, formatUSD, formatCountdown, formatBase } from '../lib/format'

interface Props {
  vault: VaultConfig
  data: VaultData
}

type Tab = 'deposit' | 'withdraw'

export function ActionPanel({ vault, data }: Props) {
  const [tab, setTab] = useState<Tab>('deposit')
  const { address } = useAccount()

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card">
      {/* Tabs */}
      <div className="flex border-b border-surface-border">
        {(['deposit', 'withdraw'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 py-3.5 text-sm font-medium capitalize transition-colors',
              tab === t
                ? 'border-b-2 border-accent text-accent'
                : 'text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-5">
        {!address ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            Connect your wallet to interact with the vault.
          </div>
        ) : tab === 'deposit' ? (
          <DepositTab vault={vault} data={data} />
        ) : (
          <WithdrawTab vault={vault} data={data} />
        )}
      </div>
    </div>
  )
}

// ── Deposit Tab ────────────────────────────────────────────────────────────────

function DepositTab({ vault, data }: Props) {
  const [inputValue, setInputValue] = useState('')

  const inputAmount = parseInputAmount(inputValue, vault.quoteDecimals)
  const previewShares = usePreviewDeposit(vault, inputAmount)

  const needsApproval =
    inputAmount > 0n &&
    data.userQuoteAllowance !== undefined &&
    data.userQuoteAllowance < inputAmount

  const { writeContract: approve, data: approveTxHash } = useWriteContract()
  const { writeContract: deposit, data: depositTxHash } = useWriteContract()

  const { isLoading: approving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  })
  const { isLoading: depositing, isSuccess: depositSuccess } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  })

  useEffect(() => {
    if (approveSuccess) {
      toast.success('Approval confirmed')
      data.refetch()
    }
  }, [approveSuccess])

  useEffect(() => {
    if (depositSuccess) {
      toast.success('Deposit confirmed!')
      setInputValue('')
      data.refetch()
    }
  }, [depositSuccess])

  const maxBalance = data.userQuoteBalance ?? 0n
  const insufficient = inputAmount > maxBalance

  function handleApprove() {
    approve({
      address: vault.quoteAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [vault.proxyAddress, maxUint256],
    })
  }

  function handleDeposit() {
    if (inputAmount === 0n) return
    deposit({
      address: vault.proxyAddress,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [inputAmount],
    })
  }

  const busy = approving || depositing

  return (
    <div className="flex flex-col gap-4">
      {/* Input */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs text-zinc-400">Amount</label>
          <button
            className="text-xs text-accent hover:text-accent-dim"
            onClick={() => setInputValue(formatRaw(maxBalance, vault.quoteDecimals))}
          >
            Max · {formatUSD(maxBalance, vault.quoteDecimals, { prefix: false })} {vault.quoteSymbol}
          </button>
        </div>
        <div className="flex items-center rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 focus-within:border-accent/50">
          <input
            type="number"
            placeholder="0.00"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-zinc-600"
          />
          <span className="text-xs font-medium text-zinc-400">{vault.quoteSymbol}</span>
        </div>
        {insufficient && (
          <p className="mt-1 text-xs text-red-400">Insufficient balance</p>
        )}
      </div>

      {/* Preview rows */}
      <PreviewRow
        label="Shares to receive"
        value={
          previewShares !== undefined && inputAmount > 0n
            ? `${formatShares(previewShares, vault.quoteDecimals)} shares`
            : '—'
        }
      />
      <PreviewRow label="Unlock after" value="4 days from deposit" />
      <PreviewRow
        label="Current share price"
        value={`${formatUSD(data.sharePrice, vault.quoteDecimals)} / share`}
      />

      {/* CTA */}
      {needsApproval ? (
        <ActionButton onClick={handleApprove} loading={busy} disabled={inputAmount === 0n}>
          Approve {vault.quoteSymbol}
        </ActionButton>
      ) : (
        <ActionButton
          onClick={handleDeposit}
          loading={busy}
          disabled={inputAmount === 0n || insufficient}
        >
          Deposit
        </ActionButton>
      )}

      <p className="text-center text-xs text-zinc-600">
        Deposits earn market-making fees. Lock period begins at deposit time.
      </p>
    </div>
  )
}

// ── Withdraw Tab ───────────────────────────────────────────────────────────────

function WithdrawTab({ vault, data }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [countdown, setCountdown] = useState('')

  const userShares = data.userShares ?? 0n
  const inputShares = parseInputAmount(inputValue, vault.quoteDecimals)
  // previewWithdraw: oracle-priced total (USDC + base) for the summary row.
  // previewWithdrawAmounts: exact token breakdown for the hover tooltip.
  const previewTotal = usePreviewWithdraw(vault, inputShares)
  const previewBreakdown = usePreviewWithdrawAmounts(vault, inputShares)

  const unlockAt = data.lastDepositTime
    ? Number(data.lastDepositTime + data.unlockInterval)
    : null

  const isLocked = unlockAt !== null && unlockAt > Math.floor(Date.now() / 1000)

  // Live countdown ticker
  useEffect(() => {
    if (!unlockAt) return
    const tick = () => setCountdown(formatCountdown(unlockAt))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [unlockAt])

  const { writeContract: withdraw, data: withdrawTxHash } = useWriteContract()
  const {
    isLoading: withdrawing,
    isSuccess: withdrawSuccess,
    data: withdrawReceipt,
  } = useWaitForTransactionReceipt({ hash: withdrawTxHash })

  useEffect(() => {
    if (!withdrawSuccess) return

    // Parse the Withdraw event to get the exact split between quote and base.
    let message = 'Withdrawal confirmed!'
    if (withdrawReceipt) {
      try {
        const logs = parseEventLogs({
          abi: VAULT_ABI,
          eventName: 'Withdraw',
          logs: withdrawReceipt.logs,
        })
        const event = logs[0]?.args
        if (event) {
          const quotePart = formatUSD(event.quoteReturned, vault.quoteDecimals)
          if (event.baseReturned > 0n) {
            const basePart = formatBase(event.baseReturned, vault.baseDecimals, vault.baseSymbol)
            message = `Received ${quotePart} ${vault.quoteSymbol} + ${basePart}`
          } else {
            message = `Received ${quotePart} ${vault.quoteSymbol}`
          }
        }
      } catch {
        // log parse failure is non-fatal — keep generic message
      }
    }

    toast.success(message, { duration: 6000 })
    setInputValue('')
    data.refetch()
  }, [withdrawSuccess])

  function handleWithdraw() {
    if (inputShares === 0n) return
    withdraw({
      address: vault.proxyAddress,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [inputShares],
    })
  }

  const insufficient = inputShares > userShares

  // NAV of user position in USDC
  const positionValue =
    userShares > 0n
      ? BigInt(
          Math.floor(
            (Number(userShares) * Number(data.sharePrice)) / 10 ** vault.quoteDecimals,
          ),
        )
      : 0n

  // Flag whether excess base is likely (LTV below lower band means hedge is light)
  const excessBaseLikely =
    data.currentLTV > 0n && data.currentLTV < 4500n

  return (
    <div className="flex flex-col gap-4">
      {/* Share balance summary */}
      <div className="rounded-lg border border-surface-border bg-surface-elevated p-3">
        <div className="mb-2 text-xs text-zinc-500">Your shares</div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-semibold text-white">
            {formatShares(userShares, vault.quoteDecimals)}
          </span>
          <span className="text-xs text-zinc-500">shares</span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          ≈ {formatUSD(positionValue, vault.quoteDecimals)} {vault.quoteSymbol}
        </div>
      </div>

      {/* Lock status banner */}
      {isLocked && unlockAt && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="text-xs text-amber-400">
            Locked · unlocks in {countdown || formatCountdown(unlockAt)}
          </span>
        </div>
      )}

      {/* Input */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs text-zinc-400">Shares to withdraw</label>
          <button
            className="text-xs text-accent hover:text-accent-dim"
            onClick={() => setInputValue(formatRaw(userShares, vault.quoteDecimals))}
          >
            Max
          </button>
        </div>
        <div className="flex items-center rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 focus-within:border-accent/50">
          <input
            type="number"
            placeholder="0.0000"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-zinc-600"
          />
          <span className="text-xs font-medium text-zinc-400">shares</span>
        </div>
        {insufficient && (
          <p className="mt-1 text-xs text-red-400">Insufficient shares</p>
        )}
      </div>

      {/* Preview with breakdown tooltip */}
      <div className="group relative">
        <PreviewRow
          label={
            <span className="flex items-center gap-1">
              Estimated total value
              {previewBreakdown && inputShares > 0n && (
                <span className="text-zinc-600 cursor-help">ⓘ</span>
              )}
            </span>
          }
          value={
            previewTotal !== undefined && inputShares > 0n
              ? `${formatUSD(previewTotal, vault.quoteDecimals)} ${vault.quoteSymbol} equiv.`
              : '—'
          }
          highlight
        />
        {previewBreakdown && inputShares > 0n && (
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-56 group-hover:block">
            <div className="rounded-lg border border-surface-border bg-surface-elevated p-3 shadow-2xl">
              <p className="mb-2 text-xs font-medium text-zinc-400">Token breakdown</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{vault.quoteSymbol}</span>
                  <span className="font-mono text-xs text-zinc-200">
                    {formatUSD(previewBreakdown.quote, vault.quoteDecimals, { prefix: false })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{vault.baseSymbol}</span>
                  <span
                    className={[
                      'font-mono text-xs',
                      previewBreakdown.base > 0n ? 'text-zinc-200' : 'text-zinc-600',
                    ].join(' ')}
                  >
                    {previewBreakdown.base > 0n
                      ? formatBase(previewBreakdown.base, vault.baseDecimals, '')
                      : '0'}
                  </span>
                </div>
              </div>
              {previewBreakdown.base > 0n && (
                <p className="mt-2 text-xs text-zinc-600">
                  {vault.baseSymbol} sent directly to your wallet.
                </p>
              )}
            </div>
            {/* Arrow */}
            <div className="ml-3 h-2 w-2 rotate-45 border-b border-r border-surface-border bg-surface-elevated" />
          </div>
        )}
      </div>

      {/* Excess base notice — shown when LTV is below the lower band */}
      {excessBaseLikely && inputShares > 0n && (
        <div className="flex items-start gap-2 rounded-lg border border-zinc-700/40 bg-zinc-800/30 px-3 py-2">
          <span className="mt-0.5 shrink-0 text-zinc-500">ℹ</span>
          <p className="text-xs text-zinc-400">
            Vault LTV is below target — some{' '}
            <span className="text-zinc-300">{vault.baseSymbol}</span> may be returned
            to your wallet alongside {vault.quoteSymbol}. Exact amounts shown after
            confirmation.
          </p>
        </div>
      )}

      {/* CTA */}
      <ActionButton
        onClick={handleWithdraw}
        loading={withdrawing}
        disabled={inputShares === 0n || insufficient || isLocked}
      >
        {isLocked ? `Locked · ${countdown}` : 'Withdraw'}
      </ActionButton>

      <p className="text-center text-xs text-zinc-600">
        Withdrawals unwind your Kuru position, repay Neverland, and return{' '}
        {vault.quoteSymbol}
        {excessBaseLikely ? ` + ${vault.baseSymbol}` : ''}.
      </p>
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function PreviewRow({
  label,
  value,
  highlight,
}: {
  label: React.ReactNode
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span
        className={[
          'font-mono text-xs font-medium',
          highlight ? 'text-accent' : 'text-zinc-300',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  loading,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  loading: boolean
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'w-full rounded-lg py-3 text-sm font-semibold transition-all',
        disabled || loading
          ? 'cursor-not-allowed bg-surface-elevated text-zinc-600'
          : 'bg-accent text-zinc-900 hover:bg-accent-dim active:scale-[0.98]',
      ].join(' ')}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner /> Confirming…
        </span>
      ) : (
        children
      )}
    </button>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseInputAmount(value: string, decimals: number): bigint {
  if (!value || isNaN(Number(value)) || Number(value) <= 0) return 0n
  try {
    return BigInt(Math.floor(parseFloat(value) * 10 ** decimals))
  } catch {
    return 0n
  }
}

function formatRaw(raw: bigint, decimals: number): string {
  return (Number(raw) / 10 ** decimals).toString()
}
