import { createClient } from '@/lib/supabase/server'
import { ScenarioPanel } from '@/components/admin/scenario/ScenarioPanel'
import type { Contract } from '@/lib/types'
import { checkAdmin } from '@/lib/auth/admin'

export default async function AdminScenarioPage() {
  // Admin + MFA checked here, not just in the layout: Next renders this page
  // and ships its data even when the layout swaps in the MFA gate.
  if (!(await checkAdmin()).ok) return null

  const supabase = await createClient()

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, slug, title, trigger_type, trigger_condition, trigger_deadline')
    .eq('status', 'active')
    .is('settled_outcome', null)
    .order('trigger_deadline')

  const activeContracts = (contracts ?? []) as unknown as Contract[]

  return <ScenarioPanel contracts={activeContracts} />
}
