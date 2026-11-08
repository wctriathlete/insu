import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import BrowseClient from './BrowseClient'
import type { ContractWithTiers, LatestOracleReading } from '@/lib/types'
import type { DisplayMode } from '@/lib/currency/config'

type Supabase = Awaited<ReturnType<typeof createClient>>

async function getContracts(supabase: Supabase): Promise<ContractWithTiers[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*, category:categories(*), coverage_tiers(*), corridor:corridors(*)')
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
  if (error) throw new Error(`Failed to load contracts: ${error.message}`)
  return (data ?? []) as unknown as ContractWithTiers[]
}

/** Latest reading per live contract — one indexed lookup each, in parallel. */
async function getLatestReadings(
  supabase: Supabase,
  contracts: ContractWithTiers[],
): Promise<Record<string, LatestOracleReading | null>> {
  const live = contracts.filter((c) => c.launch_stage !== 'coming_soon')
  const rows = await Promise.all(
    live.map((c) =>
      supabase
        .from('oracle_readings')
        .select('value, read_at, source, trigger_met')
        .eq('contract_id', c.id)
        .order('read_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => [c.id, (data ?? null) as LatestOracleReading | null] as const),
    ),
  )
  return Object.fromEntries(rows)
}

async function getDisplayMode(supabase: Supabase): Promise<DisplayMode> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'USD'
  const { data } = await supabase.from('profiles').select('preferred_currency').eq('id', user.id).single()
  return data?.preferred_currency === 'LOCAL' ? 'LOCAL' : 'USD'
}

export default async function HomePage() {
  const isConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!isConfigured) {
    // Dev/test mode without Supabase credentials — render the empty shell
    return (
      <>
        <Header />
        <BrowseClient initialContracts={[]} readings={{}} displayMode="USD" />
      </>
    )
  }

  const supabase = await createClient()
  const [contracts, displayMode] = await Promise.all([getContracts(supabase), getDisplayMode(supabase)])
  const readings = await getLatestReadings(supabase, contracts)

  return (
    <>
      <Header />
      <BrowseClient initialContracts={contracts} readings={readings} displayMode={displayMode} />
    </>
  )
}
