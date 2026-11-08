import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ContractWithTiers } from '@/lib/types'
import { CancelMarketButton } from './CancelMarketButton'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-pay-bg text-pay',
  pending: 'bg-surface-raised text-sky',
  settled: 'bg-surface-raised text-ink-secondary',
  cancelled: 'bg-surface-raised text-ink-secondary',
}

export function ContractList({ contracts }: { contracts: ContractWithTiers[] }) {
  const pending = contracts.filter((c) => c.status === 'pending')
  const rest = contracts.filter((c) => c.status !== 'pending')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl tracking-wide text-ink">Contracts</h1>
          {pending.length > 0 && (
            <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-[13px] font-semibold text-sky">
              {pending.length} pending review
            </span>
          )}
        </div>
        <Link
          href="/admin/contracts/new"
          className="rounded-md bg-sky px-4 py-2 text-sm font-bold text-on-sky hover:bg-sky-deep"
        >
          + New Contract
        </Link>
      </div>

      {/* Pending submissions section */}
      {pending.length > 0 && (
        <div className="mb-6 rounded-lg border border-sky bg-surface-raised p-4">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-sky">
            User submissions — awaiting review
          </p>
          <div className="space-y-2">
            {pending.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-[14px] font-medium text-ink">{c.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {c.category?.name} · {c.trigger_type} · submitted {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/admin/contracts/${c.id}`}
                  className="rounded-md bg-sky px-3 py-1.5 text-[13px] font-bold text-on-sky hover:bg-sky-deep"
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All contracts table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_100px_80px_90px_120px] gap-3 border-b border-border bg-surface-raised px-4 py-2.5 text-[12px] uppercase tracking-wider text-ink-muted">
          <span>Title</span><span>Category</span><span>Type</span><span>Status</span><span>Action</span>
        </div>

        {contracts.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No contracts yet.</p>
        )}

        {[...pending, ...rest].map((c) => (
          <div
            key={c.id}
            className={cn(
              'grid grid-cols-[1fr_100px_80px_90px_120px] gap-3 border-b border-border px-4 py-3 text-sm last:border-0',
              (c.status === 'settled' || c.status === 'cancelled') && 'opacity-60',
            )}
          >
            <div>
              <p className="font-medium text-ink">{c.title}</p>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                Deadline {c.trigger_deadline ? new Date(c.trigger_deadline).toLocaleDateString() : '—'}
              </p>
            </div>
            <span className="self-center text-ink-secondary capitalize">{c.category?.name ?? '—'}</span>
            <span className="self-center text-ink-secondary">{c.trigger_type}</span>
            <span className={cn('self-center rounded px-2 py-0.5 text-[12px] font-medium w-fit', STATUS_STYLES[c.status] ?? STATUS_STYLES.settled)}>
              {c.status}
            </span>
            <div className="flex items-center gap-3 self-center">
              <Link
                href={`/admin/contracts/${c.id}`}
                className="text-[13px] text-sky-deep hover:text-sky-deep"
              >
                {c.status === 'pending' ? 'Review' : 'Edit'}
              </Link>
              {c.status !== 'settled' && c.status !== 'cancelled' && (
                <CancelMarketButton contractId={c.id} title={c.title} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
