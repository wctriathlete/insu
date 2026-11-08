import { describe, it, expect } from 'vitest'
import { partitionByLaunchStage, homeSections, upcomingWindow } from '@/lib/launch'
import type { ContractWithTiers } from '@/lib/types'

function contract(over: Partial<ContractWithTiers> & { id: string }): ContractWithTiers {
  return {
    slug: over.id,
    title: over.id,
    trigger_type: 'urban',
    location: { lat: 0, lng: 0, city: 'Mexico City', country: 'MX' },
    coverage_tiers: [],
    corridor: null,
    ...over,
  } as unknown as ContractWithTiers
}

const corridor = (road: string, start: string) =>
  ({ road, name: road, window_start: start, window_end: '10:00:00' }) as ContractWithTiers['corridor']

describe('partitionByLaunchStage', () => {
  it('splits coming-soon rows from live ones and treats a missing stage as live', () => {
    const { live, comingSoon } = partitionByLaunchStage([
      { id: 'a', launch_stage: 'live' },
      { id: 'b', launch_stage: 'coming_soon' },
      { id: 'c' },
    ])
    expect(live.map((c) => c.id)).toEqual(['a', 'c'])
    expect(comingSoon.map((c) => c.id)).toEqual(['b'])
  })
})

describe('homeSections', () => {
  const am = contract({ id: 'am', corridor: corridor('Periférico Sur', '07:00:00') })
  const pm = contract({ id: 'pm', corridor: corridor('Periférico Sur', '17:00:00') })
  const viaducto = contract({ id: 'via', corridor: corridor('Viaducto', '07:00:00') })
  const air = contract({ id: 'air', trigger_type: 'air_quality' })
  const gas = contract({ id: 'gas', trigger_type: 'fuel' })
  const flood = contract({ id: 'flood', trigger_type: 'flood' })
  const gt = contract({
    id: 'gt',
    corridor: corridor('Roosevelt', '07:00:00'),
    location: { lat: 0, lng: 0, city: 'Guatemala City', country: 'GT' },
  })

  it('pairs each road once and orders the rest air, rain, gas', () => {
    const s = homeSections([gas, am, viaducto, flood, pm, air, gt], 'cdmx')
    expect(s.routes.map((r) => [r.road, r.morning?.id, r.evening?.id])).toEqual([
      ['Periférico Sur', 'am', 'pm'],
      ['Viaducto', 'via', undefined],
    ])
    expect(s.others.map((c) => c.id)).toEqual(['air', 'flood', 'gas'])
  })

  it('scopes to the selected city', () => {
    const s = homeSections([am, gt], 'guatemala_city')
    expect(s.routes.map((r) => r.road)).toEqual(['Roosevelt'])
    expect(s.others).toEqual([])
  })
})

describe('upcomingWindow', () => {
  it('shows the evening window from 10:00 to 20:00 market time, else the morning', () => {
    expect(upcomingWindow(new Date('2026-11-07T14:00:00Z'))).toBe('morning') // 08:00 local
    expect(upcomingWindow(new Date('2026-11-07T18:00:00Z'))).toBe('evening') // 12:00 local
    expect(upcomingWindow(new Date('2026-11-08T03:00:00Z'))).toBe('morning') // 21:00 local
  })
})
