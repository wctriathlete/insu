import { cn } from '@/lib/utils'

/**
 * One segment per day of the period: past = sky, today = mist, future = track
 * (handoff §5 ProtectionCard, owned).
 */
export function DayStrip({ total, current, label }: { total: number; current: number; label: string }) {
  const segments = Math.max(1, Math.min(total, 60))
  return (
    <div role="img" aria-label={label} className="flex gap-1">
      {Array.from({ length: segments }, (_, i) => {
        const day = i + 1
        return (
          <span
            key={i}
            className={cn(
              'h-2 flex-1 rounded-full',
              day < current ? 'bg-sky' : day === current ? 'bg-mist ring-1 ring-inset ring-sky' : 'bg-track',
            )}
          />
        )
      })}
    </div>
  )
}
