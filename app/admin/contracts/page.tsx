import { createServiceClient } from '@/lib/supabase/server'
import { ContractList } from '@/components/admin/contracts/ContractList'
import type { ContractWithTiers } from '@/lib/types'
import { checkAdmin } from '@/lib/auth/admin'

export default async function AdminContractsPage() {
  // Admin + MFA checked here, not just in the layout: Next renders this page
  // and ships its data even when the layout swaps in the MFA gate.
  if (!(await checkAdmin()).ok) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('contracts')
    .select('*, category:categories(*), coverage_tiers(*)')
    .order('created_at', { ascending: false })

  return <ContractList contracts={(data ?? []) as unknown as ContractWithTiers[]} />
}
