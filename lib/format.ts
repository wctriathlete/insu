/**
 * Locale-aware display formatting for Sereno screens. Dates are always shown in
 * market time (both live markets sit at UTC-6, see lib/utils/marketDay.ts),
 * never the browser's zone.
 */
import { INTL_LOCALE, type Locale } from '@/i18n/config'
import { formatMoney } from '@/lib/utils'
import { convertFromUsd } from '@/lib/currency/resolve'
import type { DisplayCurrency } from '@/lib/currency/config'

const TZ = 'America/Mexico_City'

/** 'YYYY-MM-DD' (market-local) → a Date at local noon, safe to format in TZ. */
export function dayToDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 18))
}

/** "9 de noviembre" / "November 9". */
export function formatDay(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? (date.length === 10 ? dayToDate(date) : new Date(date)) : date
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: 'numeric', month: 'long', timeZone: TZ }).format(d)
}

/** "9 nov" / "Nov 9". */
export function formatShortDay(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? (date.length === 10 ? dayToDate(date) : new Date(date)) : date
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: 'numeric', month: 'short', timeZone: TZ }).format(d)
}

/** "9–15 de noviembre" / "Nov 9 – 15". */
export function formatDayRange(start: Date | string, end: Date | string, locale: Locale): string {
  const toDate = (v: Date | string) => (typeof v === 'string' ? (v.length === 10 ? dayToDate(v) : new Date(v)) : v)
  const fmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: 'numeric', month: 'long', timeZone: TZ })
  const a = toDate(start)
  const b = toDate(end)
  if (fmt.format(a) === fmt.format(b)) return fmt.format(a)
  return fmt.formatRange(a, b)
}

/** "07:30" in market time. */
export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).format(new Date(iso))
}

/** Market-local 'YYYY-MM-DD' for an instant. */
export function marketDayOf(date: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    typeof date === 'string' ? new Date(date) : date,
  )
}

/** Authoritative USD amount → compact money in the display currency. */
export function money(amountUsd: number, currency: DisplayCurrency): string {
  return formatMoney(convertFromUsd(amountUsd, currency), currency)
}

/** "MX$23.45" / "Q31.69" — a reference price in its own market currency, 2 decimals. */
export function referencePrice(value: number, market: 'mx' | 'gt'): string {
  const n = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  return market === 'gt' ? `Q${n}` : `MX$${n}`
}
