import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'caution' | 'danger' | 'info' | 'success'

const TONES: Record<Tone, string> = {
  caution: 'bg-caution-bg text-caution-ink',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-surface-raised text-sky-deep',
  success: 'bg-pay-bg text-pay-ink',
}

/**
 * Inline message box. Errors are `role="alert"`, warnings `role="status"`
 * (handoff §9).
 */
export function Alert({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'info' ? Info : TriangleAlert
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-m px-4 py-3 text-body-s', TONES[tone], className)}
    >
      <Icon size={18} className="mt-px shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
