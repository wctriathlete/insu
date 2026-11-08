import { cn } from '@/lib/utils'

export type BadgeTone = 'info' | 'caution' | 'success' | 'neutral' | 'danger'

const TONES: Record<BadgeTone, string> = {
  info: 'bg-surface-raised text-sky-deep',
  caution: 'bg-caution-bg text-caution-ink',
  success: 'bg-pay-bg text-pay-ink',
  neutral: 'bg-track text-ink-secondary',
  danger: 'bg-danger-bg text-danger',
}

/** A word in a small pill. Status is never carried by color alone. */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-badge px-2 py-1 text-caption font-extrabold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
