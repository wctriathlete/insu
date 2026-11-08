import { cn } from '@/lib/utils'

interface MarkProps {
  className?: string
  /** Filled house with a white check — the confirmation screen only (handoff §3). */
  confirmed?: boolean
  title?: string
}

/**
 * The Insu mark: a sky-outline house touched by a sun-colored ray. Colors come
 * from tokens, so the dark variant (lighter sky/sun) follows the theme for free.
 */
export function InsuMark({ className, confirmed, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 132 80"
      className={cn('h-6 w-auto', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M58 14 H86 L122 48 V72 H94 L58 38 Z" fill="var(--sun)" />
      {confirmed ? (
        <>
          <path
            d="M10 40 L36 16 L62 40 V70 H10 Z"
            fill="var(--sky)"
            stroke="var(--sky)"
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <path
            d="M24 45 L33 54 L49 37"
            fill="none"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path
          d="M10 40 L36 16 L62 40 V70 H10 Z"
          fill="none"
          stroke="var(--sky)"
          strokeWidth="7"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

/** Mark + "Insu" wordmark in Instrument Serif, title case. */
export function InsuLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <InsuMark className="h-[22px]" />
      <span className="font-display text-[28px] leading-none text-ink">Insu</span>
    </span>
  )
}

/** Dashed house outline for empty states (handoff §6.12). */
export function EmptyHouse({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 64" className={cn('h-14 w-auto', className)} aria-hidden>
      <path
        d="M8 30 L36 6 L64 30 V60 H8 Z"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="3"
        strokeDasharray="6 5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
