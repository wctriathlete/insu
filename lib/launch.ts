import type { CitySlug, ContractWithTiers } from './types'
import { citySlugOf, commuteWindowOf, productKind } from './contracts/display'

/** Missing/unknown stage counts as live so pre-migration rows keep working. */
export function partitionByLaunchStage<T extends { launch_stage?: string }>(
  contracts: T[],
): { live: T[]; comingSoon: T[] } {
  const live: T[] = []
  const comingSoon: T[] = []
  for (const c of contracts) {
    if (c.launch_stage === 'coming_soon') comingSoon.push(c)
    else live.push(c)
  }
  return { live, comingSoon }
}

/** One corridor road with its morning/evening protections. */
export interface RoutePair {
  road: string
  morning: ContractWithTiers | null
  evening: ContractWithTiers | null
}

export interface HomeSections {
  routes: RoutePair[]
  /** Air, rain and gas for the city, in that order. */
  others: ContractWithTiers[]
}

const OTHER_ORDER = ['air_quality', 'flood', 'fuel'] as const

/**
 * Home is "one offer per thing we watch in the selected city" (handoff §6.2):
 * every corridor road once (as a morning/evening pair), then air, rain, gas.
 */
export function homeSections(live: ContractWithTiers[], city: CitySlug): HomeSections {
  const inCity = live.filter((c) => citySlugOf(c) === city)

  const byRoad = new Map<string, RoutePair>()
  for (const c of inCity) {
    if (productKind(c) !== 'traffic' || !c.corridor) continue
    const road = c.corridor.road
    const pair = byRoad.get(road) ?? { road, morning: null, evening: null }
    pair[commuteWindowOf(c.corridor)] = c
    byRoad.set(road, pair)
  }
  const routes = [...byRoad.values()].sort((a, b) => a.road.localeCompare(b.road))

  const others = inCity
    .filter((c) => (OTHER_ORDER as readonly string[]).includes(productKind(c)))
    .sort((a, b) => OTHER_ORDER.indexOf(productKind(a) as never) - OTHER_ORDER.indexOf(productKind(b) as never))

  return { routes, others }
}

/** The window to show first: the next commute that hasn't ended yet (market time). */
export function upcomingWindow(now: Date = new Date()): 'morning' | 'evening' {
  const hour = new Date(now.getTime() - 6 * 3_600_000).getUTCHours()
  return hour >= 10 && hour < 20 ? 'evening' : 'morning'
}
