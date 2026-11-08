import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import ContractDetail from '@/components/markets/ContractDetail'
import ComingSoonScreen from '@/components/markets/ComingSoonScreen'
import type { DetailBundle } from '@/components/markets/ContractCheckout'
import type { ContractDetailData, LatestOracleReading, Corridor } from '@/lib/types'
import type { DisplayMode } from '@/lib/currency/config'
import { aggregateDailyOracleSeries, type DailyMetricPoint } from '@/lib/oracle/dailySeries'

// `*` (not an explicit column list) keeps this query valid before and after
// the Sereno naming migration adds columns.
const CONTRACT_SELECT = `
  *,
  category:categories(*),
  coverage_tiers(*),
  pricing_history(id, tier_id, premium_usd_after, calculated_at),
  corridor:corridors(*)
`

type Supabase = Awaited<ReturnType<typeof createClient>>

/** ~30 days of readings reduced to a daily in-window-max metric series. */
async function loadOracleSeries(supabase: Supabase, contract: ContractDetailData): Promise<DailyMetricPoint[]> {
  const tc = contract.trigger_condition as Record<string, unknown>
  const metric = typeof tc.metric === 'string' ? tc.metric : null
  if (!metric) return []

  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('oracle_readings')
    .select('read_at, value')
    .eq('contract_id', contract.id)
    .gte('read_at', cutoff)
    .order('read_at', { ascending: false })
    .limit(5000)

  if (error) {
    console.error('[MarketPage] series fetch failed:', error.message)
    return []
  }

  const corridor = contract.corridor as Corridor | null
  const timeWindow = corridor ? { start: corridor.window_start, end: corridor.window_end } : null
  // The 30×24h cutoff touches 31 calendar days; keep the last 30 so the
  // "Se activó N … en los últimos 30 días" line says what it counts.
  return aggregateDailyOracleSeries(
    (data ?? []) as { read_at: string; value: Record<string, unknown> }[],
    metric,
    timeWindow,
  ).slice(-30)
}

async function loadBundle(supabase: Supabase, contract: ContractDetailData): Promise<DetailBundle> {
  const [latest, metricSeries] = await Promise.all([
    supabase
      .from('oracle_readings')
      .select('value, read_at, source, trigger_met')
      .eq('contract_id', contract.id)
      .order('read_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadOracleSeries(supabase, contract),
  ])
  if (latest.error) console.error('[MarketPage] oracle fetch failed:', latest.error.message)
  return {
    slug: contract.slug,
    contract,
    latestReading: (latest.data ?? null) as LatestOracleReading | null,
    metricSeries,
  }
}

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ period?: string; tier?: string; checkout?: string }>
}) {
  const { slug } = await params
  const query = await searchParams
  const isConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!isConfigured) notFound()

  const supabase = await createClient()
  const [contractResult, userResult] = await Promise.all([
    supabase.from('contracts').select(CONTRACT_SELECT).eq('slug', slug).in('status', ['active', 'settled']).single(),
    supabase.auth.getUser(),
  ])
  if (contractResult.error || !contractResult.data) notFound()

  const contract = contractResult.data as unknown as ContractDetailData
  const userId = userResult.data.user?.id ?? null

  let displayMode: DisplayMode = 'USD'
  let interested = false
  if (userId) {
    const [prof, interest] = await Promise.all([
      supabase.from('profiles').select('preferred_currency').eq('id', userId).single(),
      supabase.from('launch_interest').select('contract_id').eq('contract_id', contract.id).eq('user_id', userId).maybeSingle(),
    ])
    displayMode = prof.data?.preferred_currency === 'LOCAL' ? 'LOCAL' : 'USD'
    interested = !!interest.data
  }

  if (contract.launch_stage === 'coming_soon') {
    // "Muy pronto" is always a dark screen (handoff §6.11).
    return (
      <div data-theme="dark" className="min-h-screen bg-bg">
        <Header back={{ href: '/' }} hideSearch />
        <ComingSoonScreen contract={contract} userId={userId} initiallyInterested={interested} />
      </div>
    )
  }

  // Corridor pairs: preload the opposite window so Mañana · Tarde swaps instantly.
  const corridor = contract.corridor as Corridor | null
  let sibling: ContractDetailData | null = null
  if (contract.trigger_type === 'urban' && corridor) {
    const { data: roadCorridors } = await supabase.from('corridors').select('id').eq('road', corridor.road)
    const siblingCorridorId = ((roadCorridors ?? []) as { id: string }[]).map((c) => c.id).find((id) => id !== corridor.id)
    if (siblingCorridorId) {
      const { data } = await supabase
        .from('contracts')
        .select(CONTRACT_SELECT)
        .eq('corridor_id', siblingCorridorId)
        .eq('status', 'active')
        .neq('launch_stage', 'coming_soon')
        .maybeSingle()
      if (data) sibling = data as unknown as ContractDetailData
    }
  }

  const bundles = await Promise.all([contract, ...(sibling ? [sibling] : [])].map((c) => loadBundle(supabase, c)))
  const periodDays = Number(query.period)

  return (
    <>
      <Header back={{ href: '/' }} hideSearch />
      <ContractDetail
        bundles={bundles}
        initialSlug={contract.slug}
        userId={userId}
        displayMode={displayMode}
        watchingCapacity={interested}
        initial={{
          periodDays: Number.isFinite(periodDays) && periodDays > 0 ? periodDays : undefined,
          tierId: query.tier || undefined,
          checkout: query.checkout === '1',
        }}
      />
    </>
  )
}
