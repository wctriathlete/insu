/**
 * Which corridor rush-hour windows does a position actually cover?
 *
 * Coverage runs [purchase, purchase + N×24h] while settlement buckets
 * trigger-days by market-local date (lib/payout/processor.ts), so a "1 day"
 * buy at 11am covers tomorrow's window, not today's. These helpers enumerate
 * the covered window-days so the purchase UI can say exactly which dates are
 * protected (formatted per locale by lib/format.ts). All math uses the fixed UTC-6 market zone (see marketDay.ts) —
 * never the browser's local zone.
 */

const TZ_OFFSET_MS = 6 * 60 * 60 * 1000 // market local = UTC-6, permanently
const DAY_MS = 24 * 60 * 60 * 1000


export interface CoveredWindowDay {
  /** YYYY-MM-DD, market-local. */
  day: string
  /** 'HH:MM' market-local — set when coverage begins mid-window on this day. */
  from?: string
  /** 'HH:MM' market-local — set when coverage ends mid-window on this day. */
  until?: string
}

/** 'HH:MM' or 'HH:MM:SS' → minutes since local midnight. */
function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Shifted date whose getUTC* fields read as market-local. */
function asLocal(utcMs: number): Date {
  return new Date(utcMs - TZ_OFFSET_MS)
}

function hhmm(utcMs: number): string {
  const d = asLocal(utcMs)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** YYYY-MM-DD of the local day that begins at the given UTC instant. */
function dayKey(localMidnightUtcMs: number): string {
  const d = asLocal(localMidnightUtcMs)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Enumerate the market-local days whose [windowStart, windowEnd) rush window
 * overlaps the coverage interval [start, start + periodDays×24h], matching
 * the payout processor's per-day eligibility (trigger must land at or after
 * purchase and before expiry).
 */
export function coveredWindowDays(
  start: Date | string,
  periodDays: number,
  windowStart: string,
  windowEnd: string,
): CoveredWindowDay[] {
  const startMs = new Date(start).getTime()
  const endMs = startMs + periodDays * DAY_MS
  const wsMin = parseTime(windowStart)
  const weMin = parseTime(windowEnd)

  const local = asLocal(startMs)
  let midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + TZ_OFFSET_MS

  const out: CoveredWindowDay[] = []
  for (; midnight < endMs; midnight += DAY_MS) {
    const wStart = midnight + wsMin * 60_000
    const wEnd = midnight + weMin * 60_000
    const overlapStart = Math.max(startMs, wStart)
    const overlapEnd = Math.min(endMs, wEnd)
    if (overlapStart >= overlapEnd) continue
    out.push({
      day: dayKey(midnight),
      ...(overlapStart > wStart ? { from: hhmm(overlapStart) } : {}),
      ...(overlapEnd < wEnd ? { until: hhmm(overlapEnd) } : {}),
    })
  }
  return out
}
