import { cn } from '@/lib/utils'

interface Props {
  payLabel: string
  price: string
  receiveLabel: string
  payout: string
  /** "Se cobra en USD · ≈ MX$187 · del 9 al 15 de noviembre" */
  caption?: string
  children?: React.ReactNode
  className?: string
}

/**
 * PAGAS HOY / RECIBES SI PASA, then the caption and the main action. Amounts
 * never animate (handoff §5 PriceSummary).
 */
export function PriceSummary({ payLabel, price, receiveLabel, payout, caption, children, className }: Props) {
  return (
    <section className={cn('rounded-xl border border-border bg-surface p-5', className)}>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-eyebrow uppercase text-ink-muted">{payLabel}</dt>
          <dd className="mt-1 font-display text-amount text-ink">{price}</dd>
        </div>
        <div>
          <dt className="text-eyebrow uppercase text-ink-muted">{receiveLabel}</dt>
          <dd className="mt-1 font-display text-amount text-pay">{payout}</dd>
        </div>
      </dl>
      {caption && <p className="mt-3 text-caption text-ink-muted">{caption}</p>}
      {children && <div className="mt-4 space-y-2">{children}</div>}
    </section>
  )
}
