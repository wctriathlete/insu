import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import DepositFlow from '@/components/earn/DepositFlow'
import type { ContractWithTiers } from '@/lib/types'

export default async function DepositPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const [{ data }, { data: { user } }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, category:categories(*), coverage_tiers(*), corridor:corridors(*)')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.auth.getUser(),
  ])
  const contract = data as unknown as ContractWithTiers | null
  if (!contract || contract.launch_stage === 'coming_soon') notFound()

  return (
    <>
      <Header back={{ href: '/earn' }} hideSearch />
      <DepositFlow contract={contract} userId={user?.id ?? null} />
    </>
  )
}
