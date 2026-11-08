import { cn } from '@/lib/utils'

/** Uppercase category line above titles. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-eyebrow uppercase text-sky-deep', className)}>{children}</p>
}

const SIZES = {
  xl: 'text-[52px] leading-[0.98] sm:text-display-xl',
  l: 'text-display-l',
  m: 'text-display-m',
  s: 'text-display-s',
} as const

/**
 * Instrument Serif title. Pass rich children (t.rich with an `em` tag) to get
 * the headline pattern: second half italic in sky.
 */
export function DisplayTitle({
  as: Tag = 'h1',
  size = 'm',
  className,
  children,
}: {
  as?: 'h1' | 'h2' | 'h3' | 'p'
  size?: keyof typeof SIZES
  className?: string
  children: React.ReactNode
}) {
  return <Tag className={cn('font-display font-normal text-ink', SIZES[size], className)}>{children}</Tag>
}

/** Rich-text renderer for messages that use the `<em>` headline pattern. */
export const emphasis = {
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
}
