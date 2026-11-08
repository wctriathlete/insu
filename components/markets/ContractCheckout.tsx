'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { quoteTiers } from '@/lib/pricing/quote'
import { availablePeriods, periodMenuForContract } from '@/lib/pricing/tenors'
import { dailyHazard } from '@/lib/pricing/derivative'
import { resolveDisplayCurrency, localCurrencyForCountry } from '@/lib/currency/resolve'
import { coveredWindowDays } from '@/lib/utils/coverageWindow'
import { formatDayRange, money } from '@/lib/format'
import { formatMoney } from '@/lib/utils'
import { createHedgerPaymentIntent, activatePositionByPaymentIntent } from '@/lib/actions/purchase'
import { toggleLaunchInterest } from '@/lib/actions/launch-interest'
import { activatedDays, conditionView } from '@/lib/contracts/conditions'
import { contractEyebrow, contractName, productKind, windowLabel } from '@/lib/contracts/display'
import type { ContractDetailData, LatestOracleReading } from '@/lib/types'
import type { DisplayMode } from '@/lib/currency/config'
import type { DailyMetricPoint } from '@/lib/oracle/dailySeries'
import type { Locale } from '@/i18n/config'
import { Eyebrow, DisplayTitle } from '@/components/sereno/Typography'
import { SegmentedControl } from '@/components/sereno/SegmentedControl'
import { PeriodChoice, TierChoice, type TierOption } from '@/components/sereno/Choice'
import { PriceSummary } from '@/components/sereno/PriceSummary'
import { Button, ButtonLink } from '@/components/sereno/Button'
import { Alert } from '@/components/sereno/Alert'
import LiveCondition, { formatReading } from '@/components/sereno/LiveCondition'
import { CorridorMap } from './CorridorMap'
import HistoryChart from './HistoryChart'
import StripePaymentForm from './StripePaymentForm'
import Confirmation from './Confirmation'
import Link from 'next/link'

export interface DetailBundle {
  slug: string
  contract: ContractDetailData
  latestReading: LatestOracleReading | null
  metricSeries: DailyMetricPoint[]
}

export interface InitialSelection {
  periodDays?: number
  tierId?: string
  /** Returning from sign-up/log-in: go straight to payment. */
  checkout?: boolean
}

interface Props {
  bundle: DetailBundle
  /** The opposite commute window of the same corridor, when it exists. */
  sibling: DetailBundle | null
  /** Switch to the sibling window in place (corridor pairs). */
  onSwitchWindow?: (slug: string) => void
  userId: string | null
  displayMode: DisplayMode
  initial?: InitialSelection
  watchingCapacity: boolean
}

type Step = 'choose' | 'pay' | 'done'

function sortTiers<T extends { name: string }>(tiers: T[]): T[] {
  return [...tiers].sort((a, b) => (a.name === 'basic' ? -1 : b.name === 'basic' ? 1 : 0))
}

/**
 * Contract detail = checkout (handoff §6.3–6.6). One linear page: condition and
 * history first, then period → tier → price summary → payment inline, then the
 * confirmation in place. Period and tier are chosen exactly once.
 */
export default function ContractCheckout({
  bundle,
  sibling,
  onSwitchWindow,
  userId,
  displayMode,
  initial,
  watchingCapacity,
}: Props) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const router = useRouter()
  const { contract, latestReading, metricSeries } = bundle
  const corridor = contract.corridor ?? null
  const kind = productKind(contract)
  const country = contract.location?.country
  const currency = resolveDisplayCurrency(displayMode, country)
  const localCurrency = localCurrencyForCountry(country)
  const isRecurring = contract.is_recurring
  const isOpen = contract.status === 'active'

  // ---- period ---------------------------------------------------------------
  const tiers = useMemo(() => sortTiers(contract.coverage_tiers), [contract.coverage_tiers])
  const basic = tiers[0]
  const hazard = basic
    ? dailyHazard(basic.base_probability, latestReading ? { value: latestReading.value } : null, contract.trigger_condition as never)
    : 0
  // Near-certain periods are hidden, not disabled (handoff §5 ChoiceOption).
  const periods = isRecurring ? availablePeriods(hazard, periodMenuForContract(contract)) : []
  const defaultPeriod =
    periods.find((p) => p.days === initial?.periodDays)?.days ??
    periods.find((p) => p.days === 7)?.days ??
    periods[0]?.days ??
    null
  const [periodDays, setPeriodDays] = useState<number | null>(defaultPeriod)

  // ---- tiers ----------------------------------------------------------------
  const quotes = isRecurring && periodDays
    ? quoteTiers(contract.coverage_tiers, periodDays, contract.trigger_condition, latestReading)
    : Object.fromEntries(contract.coverage_tiers.map((tier) => [tier.id, tier.premium_usd]))
  // Same rule as the server (createHedgerPaymentIntent): the pool must back every payout the tier can make.
  const hasRoom = (tier: (typeof tiers)[number]) => tier.current_capacity_usd >= tier.payout_usd * tier.max_payouts
  const proLocked = (tier: (typeof tiers)[number]) => isRecurring && tier.max_payouts > 1 && (periodDays ?? 0) <= 1
  const selectable = tiers.filter((tier) => hasRoom(tier) && !proLocked(tier))
  const noRoom = tiers.every((tier) => !hasRoom(tier))

  const [tierPick, setTierPick] = useState<string | null>(
    initial?.tierId && tiers.some((x) => x.id === initial.tierId) ? initial.tierId : null,
  )
  const tierId = selectable.some((x) => x.id === tierPick) ? tierPick : (selectable[0]?.id ?? null)
  const tier = tiers.find((x) => x.id === tierId) ?? null
  const price = tier ? quotes[tier.id] : null

  const tierOptions: TierOption[] = tiers.map((x) => {
    const payout = money(x.payout_usd, currency)
    const locked = proLocked(x)
    return {
      id: x.id,
      title: x.max_payouts > 1 ? t('tiers.pro', { count: x.max_payouts }) : t('tiers.basic'),
      explain:
        x.max_payouts > 1
          ? t('tiers.proExplain', { total: money(x.payout_usd * x.max_payouts, currency), payout })
          : t('tiers.basicExplain', { payout }),
      price: money(quotes[x.id], currency),
      disabled: locked || !hasRoom(x),
      note: locked ? t('tiers.proLocked') : !hasRoom(x) && !noRoom ? t('detail.noCapacityTitle') : undefined,
    }
  })

  // ---- live condition + history --------------------------------------------
  const view = conditionView(contract, latestReading)
  // Mirrors the server gate in createHedgerPaymentIntent (latest reading crossed).
  const triggerActive = Boolean(latestReading?.trigger_met)
  const toDisplay = (v: number) =>
    kind === 'traffic' && corridor?.baseline_duration_s ? (corridor.baseline_duration_s * (1 + v / 100)) / 60 : v
  const historySeries = metricSeries.map((p) => ({ date: p.date, value: toDisplay(p.value) }))
  const fired = activatedDays(metricSeries, contract.trigger_condition)
  const threshold = Number((contract.trigger_condition as Record<string, unknown>).threshold)
  const op = String((contract.trigger_condition as Record<string, unknown>).operator ?? 'gt')
  const crossedDisplay = (v: number) => {
    const raw = kind === 'traffic' && corridor?.baseline_duration_s ? (v * 60 / corridor.baseline_duration_s - 1) * 100 : v
    return op === 'gte' ? raw >= threshold : op === 'lt' ? raw < threshold : op === 'lte' ? raw <= threshold : raw > threshold
  }

  // ---- dates ----------------------------------------------------------------
  const dates = useMemo(() => {
    if (!isRecurring || !periodDays) return null
    const start = new Date()
    if (corridor) {
      const days = coveredWindowDays(start, periodDays, corridor.window_start, corridor.window_end)
      if (days.length === 0) return null
      return formatDayRange(days[0].day, days[days.length - 1].day, locale)
    }
    return formatDayRange(start, new Date(start.getTime() + periodDays * 86_400_000), locale)
  }, [isRecurring, periodDays, corridor, locale])

  // ---- payment --------------------------------------------------------------
  const [step, setStep] = useState<Step>('choose')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [watching, setWatching] = useState(watchingCapacity)
  const autoStarted = useRef(false)

  const name = contractName(contract, locale, t)
  const nextUrl = `/markets/${bundle.slug}?period=${periodDays ?? ''}&tier=${tierId ?? ''}&checkout=1`

  async function startPayment() {
    if (!tierId) return
    if (!userId) {
      router.push(`/auth/signup?next=${encodeURIComponent(nextUrl)}&for=${encodeURIComponent(bundle.slug)}`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await createHedgerPaymentIntent(tierId, periodDays ?? undefined)
      if ('error' in result) {
        setError(t.has(`errors.${result.code}`) ? t(`errors.${result.code}`) : t('errors.payment'))
        return
      }
      setClientSecret(result.clientSecret)
      setExpiresAt(result.expiresAt)
      setStep('pay')
    } catch {
      setError(t('common.genericError'))
    } finally {
      setLoading(false)
    }
  }

  // Returning from auth with ?checkout=1: open payment once, then clean the URL.
  useEffect(() => {
    if (!initial?.checkout || autoStarted.current || !userId) return
    autoStarted.current = true
    window.history.replaceState(null, '', `/markets/${bundle.slug}`)
    void startPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onPaid() {
    if (!clientSecret) return
    try {
      const result = await activatePositionByPaymentIntent(clientSecret)
      if ('pending' in result) {
        // Paid but not yet settled — the webhook activates it once it clears.
        setPending(true)
        return
      }
      if ('error' in result) {
        console.error('Activation failed:', result.error)
        setError(t('payment.activationError'))
        return
      }
      setConfirmation(result.positionId.slice(0, 8).toUpperCase())
    } catch (err) {
      console.error('Activation threw:', err)
    }
    setStep('done')
    window.scrollTo({ top: 0 })
  }

  function resetChoice() {
    setStep('choose')
    setClientSecret(null)
    setExpiresAt(null)
    setError(null)
  }

  if (step === 'done' && tier && price != null) {
    return (
      <Confirmation
        contract={contract}
        sibling={sibling?.contract ?? null}
        tier={tier}
        pricePaidUsd={price}
        periodDays={isRecurring ? periodDays : null}
        coverageStart={expiresAt && periodDays ? new Date(new Date(expiresAt).getTime() - periodDays * 86_400_000) : new Date()}
        confirmation={confirmation}
        currency={currency}
      />
    )
  }

  const priceLabel = price != null ? money(price, currency) : '—'
  const payoutLabel = tier
    ? tier.max_payouts > 1
      ? t('detail.receiveUpTo', { amount: money(tier.payout_usd * tier.max_payouts, currency) })
      : money(tier.payout_usd, currency)
    : '—'
  const approx =
    price == null
      ? null
      : currency !== 'USD'
        ? t('common.approx', { amount: `${formatMoney(price, 'USD')} USD` })
        : localCurrency
          ? t('common.approx', { amount: money(price, localCurrency) })
          : null
  const caption = [t('common.chargedInUsd'), approx, dates].filter(Boolean).join(' · ')
  const canBuy = isOpen && !noRoom && !triggerActive && tier != null && (!isRecurring || periodDays != null)

  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 pb-10 pt-5 md:px-6 md:pt-8">
      <Link
        href="/"
        className="mb-4 hidden min-h-touch items-center text-body-s font-bold text-sky hover:text-sky-deep md:inline-flex"
      >
        ← {t('common.back')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {/* 1–4: what it protects, live condition, history */}
        <div className="space-y-5">
          <div className="space-y-3">
            <Eyebrow>{contractEyebrow(contract, t)}</Eyebrow>
            <DisplayTitle size="m">{name}</DisplayTitle>
            {corridor && (
              <p className="text-body text-ink-secondary">{windowLabel(corridor, t)}</p>
            )}
            {corridor && sibling?.contract.corridor && onSwitchWindow && (
              <SegmentedControl
                label={t('windows.label')}
                size="lg"
                value={bundle.slug}
                onChange={(slug) => onSwitchWindow(slug)}
                options={[bundle, sibling]
                  .sort((a, b) => (a.contract.corridor!.window_start < b.contract.corridor!.window_start ? -1 : 1))
                  .map((b) => ({
                    value: b.slug,
                    label: b.contract.corridor!.window_start < '12' ? t('windows.morningShort') : t('windows.eveningShort'),
                  }))}
                className="max-w-sm"
              />
            )}
          </div>

          {corridor && (
            <CorridorMap
              originLat={corridor.origin_lat}
              originLng={corridor.origin_lng}
              destLat={corridor.dest_lat}
              destLng={corridor.dest_lng}
              routeName={name}
              pathPolyline={corridor.path_polyline}
            />
          )}

          <section aria-labelledby="condition-title" className="rounded-card border border-border bg-surface p-5">
            <h2 id="condition-title" className="mb-3 text-title text-ink">{t('detail.conditionTitle')}</h2>
            <LiveCondition contract={contract} reading={latestReading} />
          </section>

          {metricSeries.length >= 7 && (
            <p className="text-body font-bold text-ink">
              {t('detail.history', { count: fired, days: metricSeries.length })}
            </p>
          )}

          {historySeries.length >= 3 && Number.isFinite(threshold) && (
            <details className="group rounded-card border border-border bg-surface p-5">
              <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between text-body-s font-bold text-sky">
                <span className="group-open:hidden">{t('detail.showHistory')}</span>
                <span className="hidden group-open:inline">{t('detail.hideHistory')}</span>
                <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="pt-4">
                <HistoryChart
                  series={historySeries}
                  trigger={view.trigger ?? toDisplay(threshold)}
                  crossed={crossedDisplay}
                  format={(v) => formatReading(view, v, t)}
                />
              </div>
            </details>
          )}
        </div>

        {/* 5–8: period, tier, price summary + pay, earn link */}
        <div className="space-y-5 lg:sticky lg:top-6">
          {!isOpen && <Alert tone="info">{t('errors.closed')}</Alert>}

          {isOpen && isRecurring && periods.length > 0 && (
            <PeriodChoice
              name="period"
              legend={t('detail.periodLabel')}
              value={periodDays}
              onChange={(d) => step === 'choose' && setPeriodDays(d)}
              options={periods.map((p) => ({ value: p.days, label: t('common.days', { count: p.days }) }))}
            />
          )}

          {isOpen && (
            <TierChoice
              name="tier"
              legend={t('tiers.groupLabel')}
              value={tierId}
              onChange={(id) => step === 'choose' && setTierPick(id)}
              options={tierOptions}
            />
          )}

          {isOpen && (
            <PriceSummary
              payLabel={t('detail.payToday')}
              price={priceLabel}
              receiveLabel={t('detail.receiveIf')}
              payout={payoutLabel}
              caption={caption}
            >
              {error && <Alert tone="danger">{error}</Alert>}
              {triggerActive && <Alert tone="caution">{t('detail.triggerActive')}</Alert>}

              {pending ? (
                <Alert tone="info">{t('payment.confirming')}</Alert>
              ) : step === 'pay' && clientSecret ? (
                <>
                  <StripePaymentForm clientSecret={clientSecret} amountLabel={priceLabel} onSuccess={onPaid} />
                  <Button variant="link" onClick={resetChoice}>
                    {t('payment.change')}
                  </Button>
                </>
              ) : (
                <>
                  <Button size="main" block disabled={!canBuy || loading} onClick={startPayment}>
                    {loading
                      ? t('payment.preparing')
                      : isRecurring && periodDays
                        ? t('detail.protect', { count: periodDays })
                        : t('detail.protectOnce')}
                  </Button>
                  {noRoom && (
                    <div className="space-y-2">
                      <p className="text-caption text-ink-muted">
                        <span className="font-extrabold text-ink">{t('detail.noCapacityTitle')}</span>{' '}
                        {t('detail.noCapacityBody')}
                      </p>
                      {userId && (
                        <Button
                          variant="secondary"
                          size="sm"
                          block
                          aria-pressed={watching}
                          onClick={async () => setWatching(await toggleLaunchInterest(contract.id))}
                        >
                          {watching ? t('detail.notifyCapacityOn') : t('detail.notifyCapacity')}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </PriceSummary>
          )}

          {isOpen && (
            <ButtonLink variant="link" href={`/earn/${contract.slug}`}>
              {t('detail.earnLink')} →
            </ButtonLink>
          )}
        </div>
      </div>
    </main>
  )
}
