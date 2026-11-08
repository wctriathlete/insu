import { marketDay } from '@/lib/utils/marketDay'

/**
 * Distinct market-local days, per contract, on which a reading crossed the
 * line — "Se activó N veces en 30 días" on Ganar. Built from stored
 * trigger_met flags (corridors are only polled inside their window, so a
 * crossed corridor reading is always an in-window one).
 */
export function activationDaysByContract(rows: { contract_id: string; read_at: string }[]): Record<string, number> {
  const days = new Map<string, Set<string>>()
  for (const r of rows) {
    const set = days.get(r.contract_id) ?? new Set<string>()
    set.add(marketDay(r.read_at))
    days.set(r.contract_id, set)
  }
  return Object.fromEntries([...days].map(([id, set]) => [id, set.size]))
}
