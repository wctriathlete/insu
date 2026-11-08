import { cn } from '@/lib/utils'
import { meterPercent, type MeterState } from '@/lib/contracts/conditions'

interface Props {
  value: number
  trigger: number
  min?: number
  max: number
  state: MeterState
  /** Grey fill + "last reading" label when the feed is stale (handoff §6.12). */
  stale?: boolean
  labels: { left: string; right: string }
  /** Accessible summary, e.g. "34 min hoy, línea de pago 45 min". */
  description: string
  size?: 'md' | 'lg'
  className?: string
}

/**
 * Signature element: a live reading against the payout line. Always rendered
 * next to a StatusBadge and a plain sentence — the bar alone never carries meaning.
 */
export function ConditionMeter({
  value,
  trigger,
  min = 0,
  max,
  state,
  stale,
  labels,
  description,
  size = 'md',
  className,
}: Props) {
  const fill = meterPercent(value, min, max)
  const line = meterPercent(trigger, min, max)
  const fillCls = stale ? 'bg-border-strong' : state === 'calm' ? 'bg-sky' : 'bg-sun'

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={description}
        className={cn('relative rounded-full bg-track', size === 'lg' ? 'h-3' : 'h-2')}
      >
        <div className={cn('absolute inset-y-0 left-0 rounded-full', fillCls)} style={{ width: `${fill}%` }} />
        <div
          aria-hidden
          className="absolute top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${line}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between gap-3 text-caption text-ink-muted">
        <span>{labels.left}</span>
        <span className="text-right">{labels.right}</span>
      </div>
    </div>
  )
}
