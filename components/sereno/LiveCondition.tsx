import { useLocale, useTranslations } from 'next-intl'
import { conditionView, type ConditionView } from '@/lib/contracts/conditions'
import { formatTime, referencePrice } from '@/lib/format'
import type { LatestOracleReading } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import { ConditionMeter } from './ConditionMeter'
import { StatusBadge, type BadgeTone } from './StatusBadge'
import { Alert } from './Alert'

export interface LiveConditionContract {
  trigger_type: string
  trigger_condition: Record<string, unknown>
  corridor?: { window_start: string; window_end: string; baseline_duration_s: number | null } | null
}

type T = ReturnType<typeof useTranslations>

/** Reading/trigger values formatted in the units people read. */
export function formatReading(view: ConditionView, value: number, t: T): string {
  switch (view.kind) {
    case 'traffic':
      return t('common.minutes', { count: Math.round(value) })
    case 'fuel':
      return referencePrice(value, view.fuelMarket ?? 'mx')
    case 'flood':
      return `${Math.round(value * 10) / 10} mm`
    default:
      return String(Math.round(value))
  }
}

/** The badge word for a condition state (never color alone). */
export function conditionBadge(view: ConditionView, t: T): { tone: BadgeTone; label: string } {
  if (view.value == null || view.stale) return { tone: 'neutral', label: t('status.waiting') }
  const state = view.meter?.state ?? 'calm'
  if (state === 'crossed') return { tone: 'caution', label: t('status.crossed') }
  if (state === 'heavy') return { tone: 'caution', label: t('status.heavy') }
  if (view.kind === 'air_quality') return { tone: 'success', label: t('status.good') }
  if (view.kind === 'fuel') return { tone: 'success', label: t('status.stable') }
  return { tone: 'info', label: t('status.watching') }
}

/** Full "when we pay you" sentence, with its source (handoff principle 3). */
export function conditionSentence(view: ConditionView, t: T, short = false): string {
  const fmt = (v: number) => formatReading(view, v, t)
  switch (view.kind) {
    case 'traffic':
      if (view.trigger == null || view.normalMinutes == null) return t('conditions.trafficNoBaseline')
      return short
        ? t('conditions.trafficShort', { trigger: fmt(view.trigger) })
        : t('conditions.traffic', { trigger: fmt(view.trigger), normal: fmt(view.normalMinutes) })
    case 'air_quality':
      return t(short ? 'conditions.air_qualityShort' : 'conditions.air_quality', { trigger: fmt(view.trigger ?? 0) })
    case 'flood':
      return t(short ? 'conditions.floodShort' : 'conditions.flood', { trigger: Math.round(view.trigger ?? 0) })
    case 'fuel': {
      const key = view.fuelMarket === 'gt' ? 'fuelGt' : 'fuelMx'
      return t(`conditions.${key}${short ? 'Short' : ''}`, { trigger: fmt(view.trigger ?? 0) })
    }
    default:
      return ''
  }
}

/** "34 min hoy · 30 min normal", "112 IMECA ahora", … */
export function readingLine(view: ConditionView, t: T): string | null {
  if (view.value == null) return null
  const fmt = (v: number) => formatReading(view, v, t)
  switch (view.kind) {
    case 'traffic':
      if (view.normalMinutes == null) return null
      return t(view.inWindow ? 'conditions.trafficReading' : 'conditions.trafficReadingOutside', {
        today: fmt(view.value),
        normal: fmt(view.normalMinutes),
      })
    case 'air_quality':
      return t('conditions.air_qualityReading', { value: fmt(view.value) })
    case 'flood':
      return t('conditions.floodReading', { value: Math.round(view.value * 10) / 10 })
    case 'fuel':
      return t(view.fuelMarket === 'gt' ? 'conditions.fuelGtReading' : 'conditions.fuelMxReading', { value: fmt(view.value) })
    default:
      return null
  }
}

interface Props {
  contract: LiveConditionContract
  reading: Pick<LatestOracleReading, 'value' | 'read_at' | 'source' | 'trigger_met'> | null
  /** Cards show the short sentence and a smaller layout. */
  compact?: boolean
  /** Owned cards and the detail page reassure that the protection stays active. */
  owned?: boolean
  /** Render the badge here (cards place it in their header instead). */
  showBadge?: boolean
  now?: Date
}

/**
 * Badge + ConditionMeter + plain sentence, plus the stale-data notice. Renders
 * nothing it can't back with a real reading: no reading → just the sentence.
 */
export default function LiveCondition({ contract, reading, compact, owned, showBadge = true, now }: Props) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const view = conditionView(contract, reading, now)
  const badge = conditionBadge(view, t)
  const line = readingLine(view, t)
  const sentence = conditionSentence(view, t, compact)
  const time = view.readAt ? formatTime(view.readAt, locale) : null
  const showLastReading = time && (view.stale || view.inWindow === false)
  const source = view.source ? t(`sources.${view.source}`) : ''

  return (
    <div className="space-y-3">
      {(showBadge || line) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {line && <p className="text-body-s font-bold text-ink">{line}</p>}
          {showBadge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
        </div>
      )}
      {view.meter && (
        <ConditionMeter
          {...view.meter}
          stale={view.stale}
          size={compact ? 'md' : 'lg'}
          labels={{
            left: showLastReading
              ? t('meter.lastReading', { time })
              : view.kind === 'traffic'
                ? t('meter.normal')
                : t('meter.now'),
            right: `${t('meter.payoutLine')} · ${formatReading(view, view.meter.trigger, t)}`,
          }}
          description={[line, `${t('meter.payoutLine')} ${formatReading(view, view.meter.trigger, t)}`, badge.label]
            .filter(Boolean)
            .join(', ')}
        />
      )}
      {sentence && <p className={compact ? 'text-body-s text-ink-secondary' : 'text-body text-ink-secondary'}>{sentence}</p>}
      {view.stale && time && (
        <Alert tone="caution">
          {owned ? t('conditions.stale', { source, time }) : t('conditions.staleDetail', { source, time })}
        </Alert>
      )}
    </div>
  )
}
