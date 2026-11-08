'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface SegmentOption<V extends string> {
  value: V
  label: React.ReactNode
  /** Render the option as a link (e.g. dashboard tabs keep a shareable URL). */
  href?: string
}

interface Props<V extends string> {
  options: SegmentOption<V>[]
  value: V
  onChange?: (value: V) => void
  /** Accessible name for the group. */
  label: string
  /** The city control highlights the selected item in sky (handoff §5). */
  tone?: 'default' | 'city'
  /** 44px items for time windows; 40px elsewhere. */
  size?: 'md' | 'lg'
  className?: string
}

/**
 * 2–3 equal options in a track. Buttons use aria-pressed; link options use
 * aria-current. Labels wrap rather than truncate (Spanish runs ~20% longer).
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  label,
  tone = 'default',
  size = 'md',
  className,
}: Props<V>) {
  return (
    <div role="group" aria-label={label} className={cn('flex gap-1 rounded-full bg-track p-1', className)}>
      {options.map((o) => {
        const selected = o.value === value
        const cls = cn(
          'flex flex-1 items-center justify-center rounded-full px-3 text-center text-body-s font-bold leading-tight transition-colors',
          size === 'lg' ? 'min-h-[44px]' : 'min-h-[40px]',
          selected
            ? tone === 'city'
              ? 'bg-sky font-extrabold text-on-sky'
              : 'bg-surface font-extrabold text-ink'
            : 'text-ink-secondary hover:text-ink',
        )
        return o.href ? (
          <Link
            key={o.value}
            href={o.href}
            scroll={false}
            aria-current={selected ? 'page' : undefined}
            onClick={onChange ? () => onChange(o.value) : undefined}
            className={cls}
          >
            {o.label}
          </Link>
        ) : (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange?.(o.value)}
            className={cls}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
