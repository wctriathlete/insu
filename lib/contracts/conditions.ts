/**
 * Live-condition view model for Sereno's ConditionMeter and the plain-language
 * condition sentences (handoff §5 ConditionMeter, §6.3, §6.12 stale data).
 *
 * Pure: takes the contract's trigger condition, its corridor (if any) and the
 * latest oracle reading, and returns numbers in the units people read (minutes,
 * IMECA points, mm/h, price per liter/gallon). Nothing here invents a value —
 * when a reading or baseline is missing the corresponding field is null and
 * the UI hides that element (handoff principle 4).
 */
import type { LatestOracleReading } from '@/lib/types'
import { productKind, type ProductKind } from './display'

export type MeterState = 'calm' | 'heavy' | 'crossed'

export interface MeterScale {
  /** Current reading, same units as trigger/min/max. */
  value: number
  trigger: number
  min: number
  max: number
  state: MeterState
}

export interface ConditionView {
  kind: ProductKind
  /** Trigger line in reading units (minutes for traffic). Null if not computable. */
  trigger: number | null
  /** Latest reading in reading units, or null when there is none. */
  value: number | null
  meter: MeterScale | null
  readAt: string | null
  source: string | null
  stale: boolean
  /** Traffic only: typical in-window trip in minutes (null until a baseline exists). */
  normalMinutes: number | null
  /** Traffic only: whether "now" is inside the commute window (market time). */
  inWindow: boolean | null
  /** Fuel only: which market's reference price this reads. */
  fuelMarket: 'mx' | 'gt' | null
}

interface ConditionInput {
  trigger_type: string
  trigger_condition: Record<string, unknown>
  corridor?: {
    window_start: string
    window_end: string
    baseline_duration_s: number | null
  } | null
}

const MARKET_OFFSET_MS = 6 * 60 * 60 * 1000 // both live markets sit at UTC-6

/** Minutes since local midnight in market time. */
function marketMinutes(now: Date): number {
  const local = new Date(now.getTime() - MARKET_OFFSET_MS)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}

function toMinutes(t: string): number {
  const [h, m] = t.substring(0, 5).split(':').map(Number)
  return h * 60 + m
}

export function isInWindow(windowStart: string, windowEnd: string, now: Date = new Date()): boolean {
  const mins = marketMinutes(now)
  return mins >= toMinutes(windowStart) && mins < toMinutes(windowEnd)
}

/** How old a reading may get before we call the feed stale. */
const STALE_AFTER_MS: Record<ProductKind, number> = {
  traffic: 75 * 60_000, // polled every 30 min inside the window
  air_quality: 3 * 3_600_000, // hourly feed
  flood: 3 * 3_600_000, // hourly feed
  fuel: 10 * 86_400_000, // CRE daily, MEM weekly — use the slower one
  other: Number.POSITIVE_INFINITY,
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

function stateFor(kind: ProductKind, ratio: number, triggerMet: boolean): MeterState {
  if (triggerMet || ratio >= 1) return 'crossed'
  const heavyAt = kind === 'fuel' ? 0.95 : 2 / 3
  return ratio >= heavyAt ? 'heavy' : 'calm'
}

export function conditionView(
  contract: ConditionInput,
  reading: Pick<LatestOracleReading, 'value' | 'read_at' | 'source' | 'trigger_met'> | null,
  now: Date = new Date(),
): ConditionView {
  const kind = productKind(contract)
  const tc = contract.trigger_condition ?? {}
  const metric = typeof tc.metric === 'string' ? tc.metric : null
  const threshold = num(tc.threshold)
  const raw = reading && metric ? num(reading.value?.[metric]) : null
  const readAt = reading?.read_at ?? null
  const age = readAt ? now.getTime() - new Date(readAt).getTime() : Infinity

  const base: ConditionView = {
    kind,
    trigger: null,
    value: null,
    meter: null,
    readAt,
    source: reading?.source ?? null,
    stale: false,
    normalMinutes: null,
    inWindow: null,
    fuelMarket: null,
  }

  if (kind === 'traffic' && contract.corridor) {
    const { window_start, window_end, baseline_duration_s } = contract.corridor
    const inWindow = isInWindow(window_start, window_end, now)
    const baselineS = baseline_duration_s && baseline_duration_s > 0 ? baseline_duration_s : null
    const durationS = reading ? num(reading.value?.duration_s) : null
    const index = raw
    const th = threshold ?? 50
    const normal = baselineS ? baselineS / 60 : null
    const triggerMin = normal != null ? normal * (1 + th / 100) : null
    const todayMin = durationS != null ? durationS / 60 : null
    // Outside the window the latest reading is from the last window: shown as
    // "última lectura", never flagged stale (the feed is idle by design).
    const stale = inWindow && age > STALE_AFTER_MS.traffic
    let meter: MeterScale | null = null
    if (normal != null && triggerMin != null && todayMin != null) {
      const ratio = index != null ? index / th : todayMin / triggerMin
      meter = {
        value: todayMin,
        trigger: triggerMin,
        min: normal * 0.6,
        max: normal * 2,
        state: stateFor(kind, ratio, Boolean(reading?.trigger_met)),
      }
    }
    return {
      ...base,
      trigger: triggerMin,
      value: todayMin,
      meter,
      stale,
      normalMinutes: normal,
      inWindow,
    }
  }

  if (threshold == null) return base
  const stale = readAt != null && age > STALE_AFTER_MS[kind]
  const fuelMarket = kind === 'fuel' ? (metric === 'gas_price_quetzales' ? 'gt' : 'mx') : null

  let meter: MeterScale | null = null
  if (raw != null) {
    const lowIsBad = tc.operator === 'lt' || tc.operator === 'lte'
    const ratio = lowIsBad ? (raw > 0 ? threshold / raw : 1) : raw / threshold
    const [min, max] =
      kind === 'fuel' ? [threshold * 0.8, threshold * 1.1] : [0, threshold * (4 / 3)]
    meter = { value: raw, trigger: threshold, min, max, state: stateFor(kind, ratio, Boolean(reading?.trigger_met)) }
  }

  return { ...base, trigger: threshold, value: raw, meter, stale, fuelMarket }
}

/** Position of `v` on a meter scale as a 0–100 percentage (clamped). */
export function meterPercent(v: number, min: number, max: number): number {
  if (max <= min) return 0
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
}

/**
 * Days in a daily max series that crossed the line — the "Se activó N de los
 * últimos 30 días" social proof (handoff §6.3 step 4). Only meaningful when
 * the series is the in-window daily max (lib/oracle/dailySeries.ts).
 */
export function activatedDays(
  series: { date: string; value: number }[],
  condition: Record<string, unknown>,
): number {
  const th = num(condition.threshold)
  if (th == null) return 0
  const op = String(condition.operator ?? 'gt')
  return series.filter((p) => {
    switch (op) {
      case 'gte': return p.value >= th
      case 'lte': return p.value <= th
      case 'lt': return p.value < th
      default: return p.value > th
    }
  }).length
}
