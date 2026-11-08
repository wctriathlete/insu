import { createClient } from '@/lib/supabase/server'
import { ContractForm } from '@/components/admin/contracts/ContractForm'
import type { Category } from '@/lib/types'
import { checkAdmin } from '@/lib/auth/admin'

export default async function NewContractPage() {
  // Admin + MFA checked here, not just in the layout: Next renders this page
  // and ships its data even when the layout swaps in the MFA gate.
  if (!(await checkAdmin()).ok) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('display_order')

  return <ContractForm categories={(data ?? []) as Category[]} />
}
