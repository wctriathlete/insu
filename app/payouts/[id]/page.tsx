import { notFound, redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { contractFullName, productKind } from '@/lib/contracts/display'
import { formatDay, money, referencePrice } from '@/lib/format'
import { resolveDisplayCurrency } from '@/lib/currency/resolve'
import type { Contract, Corridor, Payout } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import { Eyebrow, DisplayTitle, emphasis } from '@/components/sereno/Typography'
import { ButtonLink } from '@/components/sereno/Button'

type PayoutDetail = Payout & { contract: Contract & { corridor: Corridor | null } }

/** Sun over the house: the payout illustration. */
function SunAndHouse() {
  return (
    <svg viewBox="0 0 200 140" className="h-36 w-auto" aria-hidden>
      <circle cx="132" cy="44" r="30" fill="var(--sun)" />
      <path d="M48 82 L90 44 L132 82 V128 H48 Z" fill="var(--bg)" stroke="var(--sky)" strokeWidth="8" strokeLinejoin="round" />
      <path d="M72 96 L86 110 L110 84" fill="none" stroke="var(--pay)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Payout moment (handoff §6.8): full screen, always dark. Opened from the
 * payout notification and from Pagadas. Shows the exact reading that crossed
 * the line, from the oracle history — never an example number.
 */
export default async function PayoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTranslations()
  const locale = (await getLocale()) as Locale
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/payouts/${id}`)

  const { data } = await supabase
    .from('payouts')
    .select('*, contract:contracts(*, corridor:corridors(*)), hedger_position:hedger_positions!inner(user_id)')
    .eq('id', id)
    .eq('hedger_position.user_id', user.id)
    .maybeSingle()
  if (!data) notFound()
  const payout = data as unknown as PayoutDetail
  const { contract } = payout

  const [{ data: prof }, { data: reading }] = await Promise.all([
    supabase.from('profiles').select('preferred_currency').eq('id', user.id).single(),
    supabase
      .from('oracle_readings')
      .select('value, read_at')
      .eq('contract_id', contract.id)
      .eq('trigger_met', true)
      .lte('read_at', payout.created_at)
      .order('read_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const currency = resolveDisplayCurrency(prof?.preferred_currency === 'LOCAL' ? 'LOCAL' : 'USD', contract.location?.country)
  const done = payout.status === 'completed'

  // "Qué pasó": the triggering reading vs the line, with its source.
  const tc = contract.trigger_condition as Record<string, unknown>
  const metric = typeof tc.metric === 'string' ? tc.metric : ''
  const value = reading ? Number((reading.value as Record<string, unknown>)[metric]) : NaN
  const when = reading ? formatDay(reading.read_at, locale) : formatDay(payout.created_at, locale)
  const kind = productKind(contract)
  let happened = t('payout.genericHappened', { date: when })
  if (reading && Number.isFinite(value)) {
    const v = reading.value as Record<string, unknown>
    if (kind === 'traffic' && typeof v.duration_s === 'number' && typeof v.baseline_duration_s === 'number') {
      happened = t('payout.trafficHappened', {
        date: when,
        today: t('common.minutes', { count: Math.round(v.duration_s / 60) }),
        normal: t('common.minutes', { count: Math.round(v.baseline_duration_s / 60) }),
      })
    } else if (kind === 'air_quality') {
      happened = t('payout.airHappened', { date: when, value: Math.round(value), trigger: tc.threshold as number })
    } else if (kind === 'flood') {
      happened = t('payout.floodHappened', { date: when, value: Math.round(value * 10) / 10, trigger: tc.threshold as number })
    } else if (kind === 'fuel') {
      const market = metric === 'gas_price_quetzales' ? 'gt' : 'mx'
      happened = t('payout.fuelHappened', {
        date: when,
        value: referencePrice(value, market),
        trigger: referencePrice(Number(tc.threshold), market),
      })
    }
  }

  return (
    <div data-theme="dark" className="min-h-screen bg-bg">
      <main className="mx-auto flex w-full max-w-[520px] flex-col px-5 pb-12 pt-10">
        <SunAndHouse />
        <Eyebrow className="mt-6">{t('payout.eyebrow')}</Eyebrow>
        <DisplayTitle size="l" className="mt-2">
          {t.rich(done ? 'payout.title' : 'payout.processingTitle', emphasis)}
        </DisplayTitle>
        <p className="mt-6 font-display text-amount-xl text-pay">{money(payout.amount_usd, currency)}</p>
        <p className="mt-2 text-body text-ink-secondary">
          {done
            ? t('payout.paidOn', { date: formatDay(payout.completed_at ?? payout.created_at, locale) })
            : t('payout.processingOn', { date: formatDay(payout.created_at, locale) })}
          {' · '}
          {t('common.chargedInUsd')}
        </p>

        <section className="mt-8 rounded-card border border-border bg-surface p-5">
          <h2 className="text-title text-ink">{t('payout.whatHappened')}</h2>
          <p className="mt-1 text-body-s text-ink-muted">{contractFullName(contract, locale, t)}</p>
          <p className="mt-3 text-body text-ink-secondary">{happened}</p>
        </section>

        <ButtonLink href="/dashboard?tab=paid" variant="sun" size="main" block className="mt-8">
          {t('payout.done')}
        </ButtonLink>
        <ButtonLink href={`/markets/${contract.slug}`} variant="link" className="mt-2 self-center">
          {t('payout.protectAgain')}
        </ButtonLink>
      </main>
    </div>
  )
}
