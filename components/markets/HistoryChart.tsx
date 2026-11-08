'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { INTL_LOCALE, type Locale } from '@/i18n/config'
import type { DailyMetricPoint } from '@/lib/oracle/dailySeries'

interface Props {
  series: DailyMetricPoint[]
  /** Payout line, same units as the series. */
  trigger: number
  /** Did a day cross the line? Mirrors the contract's operator. */
  crossed: (value: number) => boolean
  /** Formats a reading for the tooltip and table, e.g. "34 min". */
  format: (value: number) => string
}

const H = 120
const GAP = 2

function dayLabel(day: string, locale: Locale): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  )
}

/**
 * "Ver historial": one bar per day (the day's highest in-window reading) against
 * the payout line. Single series, single axis; crossed days are sun-colored and
 * named in the tooltip, and an sr-only table carries the same data.
 */
export default function HistoryChart({ series, trigger, crossed, format }: Props) {
  const t = useTranslations('chart')
  const locale = useLocale() as Locale
  const [hover, setHover] = useState<number | null>(null)

  if (series.length < 3) {
    return <p className="text-body-s text-ink-muted">{t('empty')}</p>
  }

  const top = Math.max(trigger, ...series.map((p) => p.value)) * 1.15
  const y = (v: number) => H - (v / top) * H
  const n = series.length
  const lineY = y(trigger)
  const active = hover != null ? series[hover] : null

  return (
    <figure className="space-y-2">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-label text-ink">{t('byDay')}</span>
        <span className="flex items-center gap-1.5 text-caption text-ink-muted">
          <span aria-hidden className="inline-block h-[2px] w-4 bg-ink" />
          {t('line')} · {format(trigger)}
        </span>
      </figcaption>

      <div className="relative" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${n * 10} ${H}`} preserveAspectRatio="none" className="block h-[120px] w-full" aria-hidden>
          {series.map((p, i) => {
            const h = Math.max(2, H - y(p.value))
            return (
              <rect
                key={p.date}
                x={i * 10 + GAP / 2}
                y={H - h}
                width={10 - GAP}
                height={h}
                rx={1.5}
                className={cn(
                  crossed(p.value) ? 'fill-sun' : 'fill-sky',
                  hover != null && hover !== i && 'opacity-50',
                )}
              />
            )
          })}
          <line x1={0} x2={n * 10} y1={lineY} y2={lineY} className="stroke-ink" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        {/* Hit targets wider than the bars */}
        <div className="absolute inset-0 flex">
          {series.map((p, i) => (
            <div key={p.date} className="h-full flex-1" onMouseEnter={() => setHover(i)} />
          ))}
        </div>
        {active && hover != null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-m border border-border bg-surface px-3 py-2 text-caption text-ink"
            style={{ left: `${((hover + 0.5) / n) * 100}%`, transform: `translate(${hover > n / 2 ? '-100%' : '0'}, -100%)` }}
          >
            <span className="block text-ink-muted">{dayLabel(active.date, locale)}</span>
            <span className="block text-body-s font-bold">{format(active.value)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-caption text-ink-muted" aria-hidden>
        <span>{dayLabel(series[0].date, locale)}</span>
        <span>{dayLabel(series[n - 1].date, locale)}</span>
      </div>

      <table className="sr-only">
        <caption>{t('byDay')}</caption>
        <tbody>
          {series.map((p) => (
            <tr key={p.date}>
              <th scope="row">{dayLabel(p.date, locale)}</th>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
