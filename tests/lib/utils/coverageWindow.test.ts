import { describe, it, expect } from 'vitest'
import { coveredWindowDays } from '@/lib/utils/coverageWindow'

// Market-local time is permanently UTC-6 (see lib/utils/marketDay.ts).
// 17:00Z = 11:00am local, 11:00Z = 5:00am local, 14:00Z = 8:00am local.
const AM = { start: '06:00:00', end: '10:00:00' }
const PM = { start: '17:00:00', end: '20:00:00' }

describe('coveredWindowDays', () => {
  it('a 1-day buy after the AM window covers only tomorrow, in full', () => {
    const days = coveredWindowDays('2026-07-12T17:00:00Z', 1, AM.start, AM.end)
    expect(days).toEqual([{ day: '2026-07-13' }])
  })

  it('a 1-day buy before the AM window covers only today, in full', () => {
    const days = coveredWindowDays('2026-07-12T11:00:00Z', 1, AM.start, AM.end)
    expect(days).toEqual([{ day: '2026-07-12' }])
  })

  it('a 1-day buy mid-window covers the rest of today and tomorrow until purchase time', () => {
    const days = coveredWindowDays('2026-07-12T14:00:00Z', 1, AM.start, AM.end)
    expect(days).toEqual([
      { day: '2026-07-12', from: '08:00' },
      { day: '2026-07-13', until: '08:00' },
    ])
  })

  it('a 7-day buy after the AM window covers seven full windows', () => {
    const days = coveredWindowDays('2026-07-12T17:00:00Z', 7, AM.start, AM.end)
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual({ day: '2026-07-13' })
    expect(days[6]).toEqual({ day: '2026-07-19' })
    expect(days.every((d) => !d.from && !d.until)).toBe(true)
  })

  it('an evening buy after the PM window rolls to the next local day even across UTC midnight', () => {
    // 03:00Z Jul 13 = 9:00pm Jul 12 local, after the 5–8pm window
    const days = coveredWindowDays('2026-07-13T03:00:00Z', 1, PM.start, PM.end)
    expect(days).toEqual([{ day: '2026-07-13' }])
  })

  it('handles HH:MM window times without seconds', () => {
    const days = coveredWindowDays('2026-07-12T17:00:00Z', 1, '06:00', '10:00')
    expect(days).toEqual([{ day: '2026-07-13' }])
  })
})
