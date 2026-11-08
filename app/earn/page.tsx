import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from '@/lib/actions/dashboard'
import { activationDaysByContract } from '@/lib/contracts/activity'
import { partitionByLaunchStage } from '@/lib/launch'
import { formatMoney } from '@/lib/utils'
import type { ContractWithTiers, ProviderPositionWithContract } from '@/lib/types'
import Header from '@/components/layout/Header'
import { Eyebrow, DisplayTitle, emphasis } from '@/components/sereno/Typography'
import { ButtonLink } from '@/components/sereno/Button'
import PoolCard from '@/components/earn/PoolCard'
import CapitalCard from '@/components/earn/CapitalCard'

/**
 * Ganar (handoff §6.9): the calmer home for capital providers. Shows only
 * numbers we have — capacity, activations, payout size. Expected fee % is
 * hidden: provider_positions.expected_return_usd is not computed yet.
 */
export default async function EarnPage() {
  const t = await getTranslations()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const since = new Date(new Date().getTime() - 30 * 86_400_000).toISOString()
  const [contractsResult, firedResult, mine] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, category:categories(*), coverage_tiers(*), corridor:corridors(*)')
      .eq('status', 'active'),
    supabase.from('oracle_readings').select('contract_id, read_at').eq('trigger_met', true).gte('read_at', since),
    user ? getDashboardData(user.id).then((d) => d.providerPositions) : Promise.resolve([] as ProviderPositionWithContract[]),
  ])

  const { live } = partitionByLaunchStage((contractsResult.data ?? []) as unknown as ContractWithTiers[])
  const pools = live
    .filter((c) => c.coverage_tiers.some((x) => Number(x.max_capacity_usd) > 0))
    .sort((a, b) => (a.corridor?.road ?? a.trigger_type).localeCompare(b.corridor?.road ?? b.trigger_type))
  const activations = activationDaysByContract((firedResult.data ?? []) as { contract_id: string; read_at: string }[])
  const active = mine.filter((p) => p.status === 'active')
  const contributed = active.reduce((s, p) => s + Number(p.capital_deposited_usd), 0)

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[1100px] px-5 pb-10 pt-6 md:px-6">
        <Eyebrow>{t('earn.eyebrow')}</Eyebrow>
        <DisplayTitle size="m" className="mt-2">{t.rich('earn.title', emphasis)}</DisplayTitle>
        <p className="mt-3 max-w-[640px] text-body text-ink-secondary">{t('earn.intro')}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <section className="rounded-card bg-pay-bg p-5">
            <h2 className="text-title text-pay-ink">{t('earn.ifNot')}</h2>
            <p className="mt-1 text-body text-pay-ink">{t('earn.ifNotBody')}</p>
          </section>
          <section className="rounded-card bg-caution-bg p-5">
            <h2 className="text-title text-caution-ink">{t('earn.ifYes')}</h2>
            <p className="mt-1 text-body text-caution-ink">{t('earn.ifYesBody')}</p>
          </section>
        </div>

        {user && (
          <section className="mt-8 rounded-xl bg-panel p-5 text-on-panel md:p-6">
            <h2 className="text-eyebrow uppercase text-on-panel-muted">{t('earn.yourCapital')}</h2>
            <p className="mt-1 font-display text-amount">{formatMoney(contributed, 'USD')}</p>
            <p className="text-body-s text-on-panel-muted">{t('earn.activePositions', { count: active.length })}</p>
            <ButtonLink href="#fondos" variant="sun" className="mt-4">
              {t('earn.contribute')}
            </ButtonLink>
          </section>
        )}
        {mine.length > 0 && (
          <div className="mt-3 space-y-2">
            {mine.map((p) => (
              <CapitalCard key={p.id} position={p} />
            ))}
          </div>
        )}

        <section id="fondos" aria-labelledby="pools-title" className="mt-10 scroll-mt-6">
          <h2 id="pools-title" className="font-display text-display-s text-ink">{t('earn.openPools')}</h2>
          {pools.length === 0 ? (
            <p className="mt-3 text-body text-ink-secondary">{t('earn.noPools')}</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pools.map((c) => (
                <PoolCard key={c.id} contract={c} activations={activations[c.id] ?? 0} />
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 max-w-[720px] text-caption text-ink-muted">{t('earn.disclaimer')}</p>
      </main>
    </>
  )
}
