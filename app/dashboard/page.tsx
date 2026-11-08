import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { DashboardClient, type DashboardTab } from '@/components/dashboard/DashboardClient'
import { getDashboardData } from '@/lib/actions/dashboard'

const TABS: DashboardTab[] = ['active', 'paid', 'ended']
// Old tab ids from bookmarks/notifications map onto the new ones.
const LEGACY: Record<string, DashboardTab> = { protections: 'active', payouts: 'paid' }

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const isConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!isConfigured) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/dashboard')
  if (tab === 'positions') redirect('/earn')

  const [data, profile] = await Promise.all([
    getDashboardData(user.id),
    supabase.from('profiles').select('preferred_currency').eq('id', user.id).single(),
  ])
  const initialTab: DashboardTab = TABS.includes(tab as DashboardTab) ? (tab as DashboardTab) : (LEGACY[tab ?? ''] ?? 'active')

  return (
    <>
      <Header />
      <DashboardClient
        userId={user.id}
        hedgerPositions={data.hedgerPositions}
        payouts={data.payouts}
        initialTab={initialTab}
        displayMode={profile.data?.preferred_currency === 'LOCAL' ? 'LOCAL' : 'USD'}
      />
    </>
  )
}
