import { describe, it, expect } from 'vitest'
import { activatedDays, conditionView, isInWindow, meterPercent } from '@/lib/contracts/conditions'

const corridor = { window_start: '07:00:00', window_end: '10:00:00', baseline_duration_s: 1800 }
const traffic = {
  trigger_type: 'urban',
  trigger_condition: { metric: 'traffic_index', operator: 'gt', threshold: 50 },
  corridor,
}
const inWindow = new Date('2026-11-07T14:30:00Z') // 08:30 market time
const reading = (value: Record<string, unknown>, readAt: string, triggerMet = false) => ({
  value,
  read_at: readAt,
  source: 'google_maps' as const,
  trigger_met: triggerMet,
})

describe('conditionView — traffic', () => {
  it('turns the index threshold into minutes from the calibrated baseline', () => {
    const v = conditionView(traffic, reading({ traffic_index: 10, duration_s: 1980 }, '2026-11-07T14:20:00Z'), inWindow)
    expect(v.normalMinutes).toBe(30)
    expect(v.trigger).toBe(45) // 30 min × 1.5
    expect(v.value).toBe(33)
    expect(v.meter?.state).toBe('calm')
    expect(v.stale).toBe(false)
    expect(v.inWindow).toBe(true)
  })

  it('is heavy from two thirds of the line and crossed past it', () => {
    expect(conditionView(traffic, reading({ traffic_index: 40, duration_s: 2520 }, '2026-11-07T14:20:00Z'), inWindow).meter?.state).toBe('heavy')
    expect(conditionView(traffic, reading({ traffic_index: 60, duration_s: 2880 }, '2026-11-07T14:20:00Z', true), inWindow).meter?.state).toBe('crossed')
  })

  it('flags stale only inside the window', () => {
    const old = reading({ traffic_index: 5, duration_s: 1890 }, '2026-11-07T13:00:00Z') // 90 min before
    expect(conditionView(traffic, old, inWindow).stale).toBe(true)
    const evening = new Date('2026-11-07T23:00:00Z') // 17:00, outside the morning window
    expect(conditionView(traffic, old, evening).stale).toBe(false)
  })

  it('has no meter and no invented numbers without a baseline', () => {
    const v = conditionView({ ...traffic, corridor: { ...corridor, baseline_duration_s: null } }, reading({ traffic_index: 5, duration_s: 1890 }, '2026-11-07T14:20:00Z'), inWindow)
    expect(v.meter).toBeNull()
    expect(v.trigger).toBeNull()
    expect(v.normalMinutes).toBeNull()
  })
})

describe('conditionView — other products', () => {
  it('reads IMECA against the line', () => {
    const v = conditionView(
      { trigger_type: 'air_quality', trigger_condition: { metric: 'aqi_imeca', operator: 'gte', threshold: 150 } },
      reading({ aqi_imeca: 112 }, '2026-11-07T14:00:00Z'),
      inWindow,
    )
    expect(v.value).toBe(112)
    expect(v.meter).toMatchObject({ trigger: 150, min: 0, max: 200, state: 'heavy' })
  })

  it('scales fuel around the strike and knows the market', () => {
    const v = conditionView(
      { trigger_type: 'fuel', trigger_condition: { metric: 'gas_price_quetzales', operator: 'gte', threshold: 45 } },
      reading({ gas_price_quetzales: 31.69 }, '2026-11-05T14:00:00Z'),
      inWindow,
    )
    expect(v.fuelMarket).toBe('gt')
    expect(v.meter?.min).toBeCloseTo(36)
    expect(v.meter?.state).toBe('calm')
  })

  it('returns no meter when there is no reading', () => {
    const v = conditionView({ trigger_type: 'flood', trigger_condition: { metric: 'rain_1h_mm', operator: 'gte', threshold: 30 } }, null, inWindow)
    expect(v.meter).toBeNull()
    expect(v.value).toBeNull()
    expect(v.trigger).toBe(30)
  })
})

describe('helpers', () => {
  it('clamps meter positions', () => {
    expect(meterPercent(50, 0, 100)).toBe(50)
    expect(meterPercent(150, 0, 100)).toBe(100)
    expect(meterPercent(-5, 0, 100)).toBe(0)
  })

  it('checks the commute window in market time', () => {
    expect(isInWindow('07:00:00', '10:00:00', new Date('2026-11-07T13:00:00Z'))).toBe(true) // 07:00
    expect(isInWindow('07:00:00', '10:00:00', new Date('2026-11-07T16:00:00Z'))).toBe(false) // 10:00
  })

  it('counts days that crossed the line using the contract operator', () => {
    const series = [
      { date: '2026-11-01', value: 40 },
      { date: '2026-11-02', value: 50 },
      { date: '2026-11-03', value: 61 },
    ]
    expect(activatedDays(series, { operator: 'gt', threshold: 50 })).toBe(1)
    expect(activatedDays(series, { operator: 'gte', threshold: 50 })).toBe(2)
  })
})
