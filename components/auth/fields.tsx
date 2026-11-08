import { cn } from '@/lib/utils'

export const inputCls =
  'h-[52px] w-full rounded-m border border-border-strong bg-surface px-4 text-body text-ink outline-none placeholder:text-ink-muted focus:border-sky aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger'

export function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-label text-ink">
        {label}
      </label>
      {children}
      {hint && <p id={`${id}-hint`} className="text-caption text-ink-muted">{hint}</p>}
    </div>
  )
}
