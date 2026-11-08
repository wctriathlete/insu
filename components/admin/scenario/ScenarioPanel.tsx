'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { injectReading, type InjectResult } from '@/lib/actions/oracle/injectReading'
import type { Contract } from '@/lib/types'
import type { TriggerCondition } from '@/lib/oracle/trigger'

interface Props {
  contracts: Contract[]
}

const inputCls =
  'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink focus:border-sky focus:outline-none'
const labelCls = 'mb-1 block text-[12px] uppercase tracking-wider text-ink-muted'

function operatorSymbol(op: string) {
  return op === 'gte' ? '≥' : op === 'lte' ? '≤' : op === 'gt' ? '>' : '<'
}

function defaultJson(condition: TriggerCondition | null): string {
  if (!condition?.metric) return '{}'
  return JSON.stringify({ [condition.metric]: condition.threshold }, null, 2)
}

export function ScenarioPanel({ contracts }: Props) {
  const [contractId, setContractId] = useState('')
  const [valueJson, setValueJson] = useState('{}')
  const [source, setSource] = useState('manual')
  const [result, setResult] = useState<InjectResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedContract = contracts.find((c) => c.id === contractId)
  const condition = selectedContract
    ? (selectedContract.trigger_condition as unknown as TriggerCondition)
    : null

  function handleContractChange(id: string) {
    setContractId(id)
    setResult(null)
    setError(null)
    const contract = contracts.find((c) => c.id === id)
    const cond = contract ? (contract.trigger_condition as unknown as TriggerCondition) : null
    setValueJson(defaultJson(cond))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contractId) return
    setError(null)
    setResult(null)

    startTransition(async () => {
      const res = await injectReading(contractId, valueJson, source || 'manual')
      if (!res.ok) {
        setError(res.error)
      } else {
        setResult(res)
      }
    })
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 font-display text-2xl tracking-wide text-ink">Scenario Panel</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Inject a manual oracle reading to simulate a trigger condition — for demos and testing.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelCls}>Contract</label>
          <select
            className={inputCls + ' cursor-pointer'}
            value={contractId}
            onChange={(e) => handleContractChange(e.target.value)}
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

        {condition && (
          <div className="rounded-lg border border-border bg-surface-raised px-4 py-3">
            <p className={labelCls}>Trigger condition</p>
            <p className="tabular-nums text-sm text-ink">
              {condition.metric}{' '}
              <span className="text-sky">{operatorSymbol(condition.operator)}</span>{' '}
              {condition.threshold}
            </p>
          </div>
        )}

        <div>
          <label className={labelCls}>Reading value (JSON)</label>
          <textarea
            className={inputCls + ' tabular-nums'}
            rows={5}
            value={valueJson}
            onChange={(e) => setValueJson(e.target.value)}
            spellCheck={false}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Source label</label>
          <input
            className={inputCls}
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="manual"
          />
        </div>

        {error && (
          <p className="rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!contractId || isPending}
          className="w-full rounded-md bg-sky py-2.5 text-sm font-bold tracking-wide text-on-sky disabled:opacity-40 hover:bg-sky-deep"
        >
          {isPending ? 'Injecting…' : 'Inject Reading'}
        </button>
      </form>

      {result && (
        <div className="mt-6 space-y-3 rounded-lg border border-border bg-surface-raised p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
            ✓ Reading written
          </p>

          {result.trigger_met ? (
            <div className="space-y-1">
              <p className="text-sm font-bold text-pay">TRIGGER MET: YES</p>
              <p className="tabular-nums text-sm text-ink-secondary">
                {result.metric} = {result.actual_value}{' '}
                <span className="text-sky">{operatorSymbol(result.operator)}</span>{' '}
                threshold {result.threshold}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-bold text-ink-secondary">TRIGGER NOT MET</p>
              <p className="tabular-nums text-sm text-ink-secondary">
                {result.metric} = {result.actual_value}{' '}
                <span className="text-sky">{operatorSymbol(result.operator)}</span>{' '}
                threshold {result.threshold} ✗
              </p>
              <p className="text-xs text-ink-muted">
                Trigger condition was not satisfied — contract remains active.
              </p>
            </div>
          )}

          <Link
            href={`/admin/trigger?contract=${result.contract_slug}`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-sky bg-surface-raised px-4 py-2 text-sm font-semibold text-sky transition-colors hover:bg-surface-raised"
          >
            Settle this contract now →
          </Link>
        </div>
      )}
    </div>
  )
}
