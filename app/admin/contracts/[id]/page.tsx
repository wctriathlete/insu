import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { ContractForm } from '@/components/admin/contracts/ContractForm'
import type { Category, ContractWithTiers } from '@/lib/types'
import { checkAdmin } from '@/lib/auth/admin'

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Admin + MFA checked here, not just in the layout: Next renders this page
  // and ships its data even when the layout swaps in the MFA gate.
  if (!(await checkAdmin()).ok) return null

  const supabase = createServiceClient()

  const categoriesResult = await supabase.from('categories').select('*').order('display_order')
  const contractResult = await supabase
    .from('contracts')
    .select('*, category:categories(*), coverage_tiers(*), corridor:corridors(*)')
    .eq('id', id)
    .single()

  const contract = contractResult.data
  if (!contract) notFound()

  return (
    <ContractForm
      categories={(categoriesResult.data ?? []) as Category[]}
      contract={contract as unknown as ContractWithTiers}
    />
  )
}
