'use client'

import { cn } from '@/lib/utils'

/* Period and tier pickers are native radio groups: arrow keys, labels and
   screen-reader semantics come from the platform (handoff §9). */

interface PeriodProps {
  name: string
  legend: string
  options: { value: number; label: string }[]
  value: number | null
  onChange: (value: number) => void
}

/** Grid of equal 48px period buttons; selected = 2px sky border on surface-raised. */
export function PeriodChoice({ name, legend, options, value, onChange }: PeriodProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-label text-ink">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const checked = o.value === value
          return (
            <label
              key={o.value}
              className={cn(
                'relative flex min-h-12 cursor-pointer items-center justify-center rounded-m border px-2 text-center text-body-s font-bold transition-colors',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky',
                checked
                  ? 'border-2 border-sky bg-surface-raised text-ink'
                  : 'border-border-strong bg-surface text-ink-secondary hover:border-sky',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export interface TierOption {
  id: string
  title: string
  explain: string
  price: string
  disabled?: boolean
  /** Caption shown under a dimmed row (e.g. Pro on a 1-day period). */
  note?: string
}

interface TierProps {
  name: string
  legend: string
  options: TierOption[]
  value: string | null
  onChange: (id: string) => void
}

/** Stacked radio rows in one bordered group, price in the `amount` style. */
export function TierChoice({ name, legend, options, value, onChange }: TierProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-label text-ink">{legend}</legend>
      <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {options.map((o) => {
          const checked = o.id === value
          return (
            <label
              key={o.id}
              className={cn(
                'flex items-start gap-3 p-4 transition-colors',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-sky',
                o.disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-surface-raised',
                checked && 'bg-surface-raised',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={checked}
                disabled={o.disabled}
                onChange={() => onChange(o.id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  checked ? 'border-sky' : 'border-border-strong',
                  o.disabled && 'opacity-40',
                )}
              >
                {checked && <span className="h-2.5 w-2.5 rounded-full bg-sky" />}
              </span>
              <span className={cn('min-w-0 flex-1', o.disabled && 'opacity-40')}>
                <span className="block text-title text-ink">{o.title}</span>
                <span className="block text-body-s text-ink-secondary">{o.explain}</span>
              </span>
              <span className={cn('shrink-0 font-display text-amount text-ink', o.disabled && 'opacity-40')}>
                {o.price}
              </span>
              {o.note && <span className="sr-only">{o.note}</span>}
            </label>
          )
        })}
      </div>
      {options.filter((o) => o.note).map((o) => (
        <p key={o.id} className="mt-2 text-caption text-ink-muted" aria-hidden>
          {o.note}
        </p>
      ))}
    </fieldset>
  )
}
