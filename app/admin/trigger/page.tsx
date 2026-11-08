import { createServiceClient } from '@/lib/supabase/server'
import { TriggerOverride } from '@/components/admin/trigger/TriggerOverride'
import type { Contract, HedgerPosition } from '@/lib/types'
import { checkAdmin } from '@/lib/auth/admin'

export default async function AdminTriggerPage({
  searchParams,
}: {
  searchParams: Promise<{ contract?: string }>
}) {
  const { contract: contractSlug } = await searchParams

  // Admin + MFA checked here, not just in the layout: Next renders this page
  // and ships its data even when the layout swaps in the MFA gate.
  if (!(await checkAdmin()).ok) return null

  // hedger_positions is own-only under RLS, so a user-scoped read would surface
  // only the admin's own positions and under-count buyer exposure on the override
  // summary. Read via the service client so counts reflect every hedger.
  const supabase = createServiceClient()

  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('status', 'active')
    .order('trigger_deadline')

  const activeContracts = (contracts ?? []) as unknown as Contract[]

  const initialContractId = contractSlug
    ? (activeContracts.find((c) => c.slug === contractSlug)?.id ?? '')
    : ''

  const summaries = await Promise.all(
    activeContracts.map(async (contract) => {
      const { data: positions } = await supabase
        .from('hedger_positions')
        .select('payout_amount_usd')
        .eq('contract_id', contract.id)
        .eq('status', 'active')

      const hedgers = (positions ?? []) as Pick<HedgerPosition, 'payout_amount_usd'>[]
      const totalPayout = hedgers.reduce((sum, p) => sum + p.payout_amount_usd, 0)

      const { data: reading } = await supabase
        .from('oracle_readings')
        .select('trigger_met, value, read_at')
        .eq('contract_id', contract.id)
        .order('read_at', { ascending: false })
        .limit(1)
        .single()

      const r = reading as { trigger_met: boolean; value: Record<string, unknown>; read_at: string } | null

      return {
        contract,
        hedgerCount: hedgers.length,
        totalPayout,
        oracleStatus: r ? (r.trigger_met ? 'TRIGGERED' : 'NO TRIGGER') : 'NO READINGS',
        lastValue: r ? JSON.stringify(r.value).slice(0, 40) : '—',
      }
    }),
  )

  return <TriggerOverride contracts={activeContracts} summaries={summaries} initialContractId={initialContractId} />
}
