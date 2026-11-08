'use client'

import { useLocale, useTranslations } from 'next-intl'
import { coveredWindowDays } from '@/lib/utils/coverageWindow'
import { formatDayRange, money } from '@/lib/format'
import { contractName, windowLabel, commuteWindowOf } from '@/lib/contracts/display'
import type { ContractWithTiers, CoverageTier } from '@/lib/types'
import type { DisplayCurrency } from '@/lib/currency/config'
import type { Locale } from '@/i18n/config'
import { InsuMark } from '@/components/sereno/Logo'
import { Eyebrow, DisplayTitle, emphasis } from '@/components/sereno/Typography'
import { ButtonLink } from '@/components/sereno/Button'

interface Props {
  contract: ContractWithTiers
  sibling: ContractWithTiers | null
  tier: CoverageTier
  pricePaidUsd: number
  periodDays: number | null
  coverageStart: Date
  confirmation: string | null
  currency: DisplayCurrency
}

/** "Listo. Ya puedes respirar." — replaces the old "Protection confirmed!" (handoff §6.6). */
export default function Confirmation({
  contract,
  sibling,
  tier,
  pricePaidUsd,
  periodDays,
  coverageStart,
  confirmation,
  currency,
}: Props) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const corridor = contract.corridor ?? null

  let dates: string | null = null
  if (periodDays) {
    if (corridor) {
      const days = coveredWindowDays(coverageStart, periodDays, corridor.window_start, corridor.window_end)
      if (days.length > 0) dates = formatDayRange(days[0].day, days[days.length - 1].day, locale)
    } else {
      dates = formatDayRange(coverageStart, new Date(coverageStart.getTime() + periodDays * 86_400_000), locale)
    }
  }

  const receive =
    tier.max_payouts > 1
      ? t('detail.receiveUpTo', { amount: money(tier.payout_usd * tier.max_payouts, currency) })
      : money(tier.payout_usd, currency)

  const rows: [string, string][] = [
    [t('confirm.route'), contractName(contract, locale, t)],
    ...(corridor ? [[t('confirm.window'), windowLabel(corridor, t)] as [string, string]] : []),
    ...(periodDays ? [[t('confirm.period'), t('common.days', { count: periodDays })] as [string, string]] : []),
    ...(dates ? [[t('confirm.dates'), dates] as [string, string]] : []),
  ]

  const siblingWindow = sibling?.corridor
    ? t(`windows.${commuteWindowOf(sibling.corridor)}Plural`)
    : null

  return (
    <main className="mx-auto w-full max-w-[560px] px-5 pb-12 pt-8">
      <InsuMark confirmed className="h-12" />
      <Eyebrow className="mt-6">{t('confirm.eyebrow')}</Eyebrow>
      <DisplayTitle size="l" className="mt-2">
        {t.rich('confirm.title', emphasis)}
      </DisplayTitle>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <dl className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 text-body-s">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="text-right font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <dt className="text-eyebrow uppercase text-ink-muted">{t('confirm.paid')}</dt>
            <dd className="mt-1 font-display text-amount text-ink">{money(pricePaidUsd, currency)}</dd>
          </div>
          <div>
            <dt className="text-eyebrow uppercase text-ink-muted">{t('confirm.receive')}</dt>
            <dd className="mt-1 font-display text-amount text-pay">{receive}</dd>
          </div>
        </dl>
        <p className="mt-3 text-caption text-ink-muted">{t('common.chargedInUsd')}</p>
        {confirmation && (
          <p className="mt-3 text-body-s text-ink-secondary">
            {t('confirm.confirmation')} <span className="font-extrabold text-ink">#{confirmation}</span>
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-display-s text-ink">{t('confirm.nextTitle')}</h2>
        <ol className="mt-3 space-y-3">
          {(['next1', 'next2', 'next3'] as const).map((k, i) => (
            <li key={k} className="flex gap-3 text-body text-ink-secondary">
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-raised text-body-s font-extrabold text-sky"
              >
                {i + 1}
              </span>
              {t(`confirm.${k}`)}
            </li>
          ))}
        </ol>
      </section>

      {sibling && siblingWindow && (
        <section className="mt-8 rounded-card bg-mist p-5">
          <h2 className="text-title text-ink">{t('confirm.crossSellTitle')}</h2>
          <p className="mt-1 text-body text-sky-deep">{t('confirm.crossSellBody', { window: siblingWindow })}</p>
          <ButtonLink href={`/markets/${sibling.slug}`} variant="secondary" size="sm" className="mt-3">
            {t('confirm.crossSellCta', { window: siblingWindow })}
          </ButtonLink>
        </section>
      )}

      <ButtonLink href="/dashboard" variant="ink" size="main" block className="mt-8">
        {t('confirm.goProtections')}
      </ButtonLink>
    </main>
  )
}
