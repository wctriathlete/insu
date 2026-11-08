'use client'

import { useState, useTransition } from 'react'
import { retryPayout } from '@/lib/actions/admin'
import { cn } from '@/lib/utils'

interface PayoutRow {
  id: string
  amount_usd: number
  status: string
  created_at: string
  transfer_id: string | null
  contractTitle: string
  userFullName: string | null
}

interface Props {
  payouts: PayoutRow[]
}

type Filter = 'all' | 'processing' | 'completed'

export function PayoutQueue({ payouts: initialPayouts }: Props) {
  const [payouts, setPayouts] = useState(initialPayouts)
  const [filter, setFilter] = useState<Filter>('all')
  const [retrying, setRetrying] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  const processingCount = payouts.filter((p) => p.status === 'processing').length
  const completedCount = payouts.filter((p) => p.status === 'completed').length
  const totalVolume = payouts.reduce((sum, p) => sum + p.amount_usd, 0)

  const filtered = filter === 'all' ? payouts
    : payouts.filter((p) => p.status === filter)

  function handleRetry(payoutId: string) {
    setRetrying(payoutId)
    setErrors((prev) => { const next = { ...prev }; delete next[payoutId]; return next })

    startTransition(async () => {
      try {
        await retryPayout(payoutId)
        setPayouts((prev) =>
          prev.map((p) => p.id === payoutId ? { ...p, status: 'completed' } : p),
        )
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          [payoutId]: err instanceof Error ? err.message : 'Retry failed',
        }))
      } finally {
        setRetrying(null)
      }
    })
  }

  const statCls = 'rounded-lg border p-4 text-center'

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl tracking-wide text-ink">Payout Queue</h1>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className={cn(statCls, 'border-border')}>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-ink-muted">Total</p>
          <p className="tabular-nums text-2xl text-ink">{payouts.length}</p>
        </div>
        <div className={cn(statCls, 'border-pay')}>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-ink-muted">Completed</p>
          <p className="tabular-nums text-2xl text-pay">{completedCount}</p>
        </div>
        <div className={cn(statCls, processingCount > 0 ? 'border-sky' : 'border-border')}>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-ink-muted">Processing</p>
          <p className={cn('tabular-nums text-2xl', processingCount > 0 ? 'text-sky' : 'text-ink')}>{processingCount}</p>
        </div>
        <div className={cn(statCls, 'border-border')}>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-ink-muted">Volume</p>
          <p className="tabular-nums text-2xl text-ink">${(totalVolume / 1000).toFixed(0)}k</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {(['all', 'processing', 'completed'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition-colors',
              filter === f
                ? 'bg-surface-raised text-ink'
                : 'text-ink-muted hover:text-ink-secondary',
            )}
          >
            {f === 'processing' ? `Processing (${processingCount})` : f === 'all' ? 'All' : 'Completed'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_130px_80px_90px_90px_80px] gap-3 border-b border-border bg-surface-raised px-4 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted">
          <span>User / Contract</span><span>Transfer ID</span><span>Amount</span><span>Created</span><span>Status</span><span>Action</span>
        </div>

        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No payouts found.</p>
        )}

        {filtered.map((payout) => (
          <div key={payout.id}>
            <div
              className={cn(
                'grid grid-cols-[1fr_130px_80px_90px_90px_80px] gap-3 border-b border-border px-4 py-3 text-sm last:border-0 items-center',
                payout.status === 'processing' && 'border-sky',
                payout.status === 'completed' && 'opacity-65',
              )}
            >
              <div>
                <p className="font-medium text-ink">{payout.userFullName ?? 'Unknown'}</p>
                <p className="text-[12px] text-ink-muted">{payout.contractTitle}</p>
              </div>
              <span className="truncate tabular-nums text-[12px] text-ink-muted">
                {payout.transfer_id ?? '—'}
              </span>
              <span className="tabular-nums text-pay">${payout.amount_usd.toLocaleString()} USD</span>
              <span className="text-ink-muted">{new Date(payout.created_at).toLocaleDateString()}</span>
              <span className={cn(
                'rounded px-2 py-0.5 text-[12px] font-medium w-fit',
                payout.status === 'completed' ? 'bg-pay-bg text-pay' : 'bg-surface-raised text-sky',
              )}>
                {payout.status}
              </span>
              <div>
                {payout.status === 'processing' && (
                  <button
                    onClick={() => handleRetry(payout.id)}
                    disabled={retrying === payout.id}
                    className="rounded-md bg-sky px-3 py-1 text-[13px] font-bold text-on-sky disabled:opacity-50 hover:bg-sky-deep"
                  >
                    {retrying === payout.id ? '…' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
            {errors[payout.id] && (
              <div className="border-b border-border bg-danger-bg px-4 py-2 text-[13px] text-danger">
                {errors[payout.id]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
