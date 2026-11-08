'use client'

import { useState, useTransition } from 'react'
import { overrideContractTrigger } from '@/lib/actions/admin'
import { cn } from '@/lib/utils'
import type { Contract } from '@/lib/types'

interface ContractSummary {
  contract: Contract
  hedgerCount: number
  totalPayout: number
  oracleStatus: string
  lastValue: string
}

interface Props {
  contracts: Contract[]
  summaries: ContractSummary[]
  initialContractId?: string
}

export function TriggerOverride({ contracts, summaries, initialContractId }: Props) {
  const [contractId, setContractId] = useState(initialContractId ?? '')
  const [outcome, setOutcome] = useState<boolean | null>(null)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const summary = summaries.find((s) => s.contract.id === contractId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contractId || outcome === null || !reason.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        await overrideContractTrigger({ contractId, outcome: outcome!, reason })
        setSuccess(true)
        setContractId('')
        setOutcome(null)
        setReason('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Override failed')
      }
    })
  }

  const inputCls = 'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink focus:border-sky focus:outline-none'
  const labelCls = 'mb-1 block text-[12px] uppercase tracking-wider text-ink-muted'

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 font-display text-2xl tracking-wide text-ink">Trigger Override</h1>
      <p className="mb-6 text-sm text-ink-muted">Force-settle a contract, bypassing the oracle. This cannot be undone.</p>

      {success && (
        <div className="mb-4 rounded-md border border-pay bg-pay-bg px-4 py-3 text-sm text-pay">
          Contract settled successfully. Payouts queued.
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelCls}>Contract</label>
          <select
            className={inputCls + ' cursor-pointer'}
            value={contractId}
            onChange={(e) => { setContractId(e.target.value); setOutcome(null) }}
            required
          >
            <option value="">Select a contract…</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} · {c.trigger_deadline ? new Date(c.trigger_deadline).toLocaleDateString() : '—'}
              </option>
            ))}
          </select>
        </div>

        {summary && (
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className={labelCls}>Active hedgers</p>
                <p className="tabular-nums text-ink">{summary.hedgerCount}</p>
              </div>
              <div>
                <p className={labelCls}>Total payout</p>
                <p className="tabular-nums text-pay">${summary.totalPayout.toLocaleString()}</p>
              </div>
              <div>
                <p className={labelCls}>Oracle</p>
                <p className="tabular-nums text-ink-secondary">{summary.oracleStatus}</p>
              </div>
              <div>
                <p className={labelCls}>Trigger type</p>
                <p className="text-ink-secondary">{summary.contract.trigger_type}</p>
              </div>
              <div className="col-span-2">
                <p className={labelCls}>Last reading</p>
                <p className="text-ink-secondary">{summary.lastValue || '—'}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Settlement outcome</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOutcome(true)}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                outcome === true
                  ? 'border-pay bg-pay-bg'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <p className="mb-1 text-sm font-bold text-pay">⚡ TRIGGER FIRED</p>
              <p className="text-[13px] text-ink-muted">Hedgers receive payouts. Settles as outcome = true.</p>
            </button>
            <button
              type="button"
              onClick={() => setOutcome(false)}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                outcome === false
                  ? 'border-ink-secondary bg-surface-raised'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <p className="mb-1 text-sm font-bold text-ink-secondary">✕ NO TRIGGER</p>
              <p className="text-[13px] text-ink-muted">No payouts. Providers keep yield. outcome = false.</p>
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>Reason (required)</label>
          <textarea
            className={inputCls}
            rows={2}
            placeholder="e.g. Oracle API outage confirmed by OWM support"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isPending || outcome === null || !contractId || !reason.trim()}
          className="w-full rounded-md bg-danger py-2.5 text-sm font-bold tracking-wide text-white disabled:opacity-40 hover:bg-danger"
        >
          {isPending
            ? 'Processing…'
            : outcome === null
              ? 'SELECT AN OUTCOME TO CONFIRM'
              : `CONFIRM OVERRIDE — ${outcome ? 'TRIGGER FIRED' : 'NO TRIGGER'}`}
        </button>

        {contractId && outcome !== null && (
          <p className="text-center text-[13px] text-ink-muted">
            This will immediately settle the contract{outcome ? ` and queue Stripe payouts for ${summary?.hedgerCount ?? '?'} hedgers` : ''}.
          </p>
        )}
      </form>
    </div>
  )
}
