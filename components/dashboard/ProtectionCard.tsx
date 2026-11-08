'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { coveredWindowDays } from '@/lib/utils/coverageWindow'
import { formatShortDay, marketDayOf, money } from '@/lib/format'
import { commuteWindowOf, contractEyebrow, contractName, windowLabel, productKind } from '@/lib/contracts/display'
import { resolveDisplayCurrency } from '@/lib/currency/resolve'
import type { DisplayMode } from '@/lib/currency/config'
import type { HedgerPositionWithContract } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import { StatusBadge } from '@/components/sereno/StatusBadge'
import { DayStrip } from '@/components/sereno/DayStrip'
import LiveCondition from '@/components/sereno/LiveCondition'

const DAY_MS = 86_400_000

/**
 * Owned protection (handoff §5 ProtectionCard, owned): title + window · tier,
 * status word, the live reading, Pagaste · Recibes si pasa · Termina, and a
 * day strip. Never shows raw trigger_type.
 */
export function ProtectionCard({
  position,
  displayMode,
}: {
  position: HedgerPositionWithContract
  displayMode: DisplayMode
}) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const { contract, tier, status, premium_paid_usd, payout_amount_usd, purchased_at, expires_at } = position
  const currency = resolveDisplayCurrency(displayMode, contract.location?.country)
  const corridor = contract.corridor ?? null
  const kind = productKind(contract)

  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), [])
  const purchasedMs = new Date(purchased_at).getTime()
  const expiresMs = new Date(expires_at).getTime()
  const totalDays = position.coverage_period_days ?? Math.max(1, Math.round((expiresMs - purchasedMs) / DAY_MS))

  const maxPayouts = tier.max_payouts ?? 1
  const payoutsMade = position.payouts_made ?? 0
  const isActive = status === 'active'
  const badge =
    status === 'paid_out'
      ? { tone: 'success' as const, label: t('status.paid') }
      : status === 'expired'
        ? { tone: 'neutral' as const, label: t('status.ended') }
        : payoutsMade > 0
          ? { tone: 'success' as const, label: t('status.payments', { count: payoutsMade }) }
          : { tone: 'info' as const, label: t('status.active') }

  // Day strip: corridor protections count covered windows; others count days.
  let current = Math.min(totalDays, Math.max(1, Math.floor((now - purchasedMs) / DAY_MS) + 1))
  let total = totalDays
  if (corridor) {
    const days = coveredWindowDays(purchased_at, totalDays, corridor.window_start, corridor.window_end)
    if (days.length > 0) {
      total = days.length
      const today = marketDayOf(new Date(now))
      const idx = days.findIndex((d) => d.day >= today)
      current = idx === -1 ? total : idx + 1
    }
  }
  const remaining = Math.max(0, total - current)
  const progress = corridor
    ? t('dashboard.dayProgress', {
        window: t(`windows.${commuteWindowOf(corridor)}Short`),
        current,
        total,
        remaining,
      })
    : t('dashboard.dayProgressPlain', { current, total, remaining })

  const receiveLeft = isActive ? payout_amount_usd * (position.payouts_remaining ?? maxPayouts) : payout_amount_usd * payoutsMade
  const tierLabel = maxPayouts > 1 ? t('tiers.pro', { count: maxPayouts }) : t('tiers.basic')

  return (
    <Link
      href={`/markets/${contract.slug}`}
      className="block rounded-card border border-border bg-surface p-5 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-sky-deep">{contractEyebrow(contract, t)}</p>
          <h3 className="mt-1 text-title text-ink">{contractName(contract, locale, t)}</h3>
          <p className="text-body-s text-ink-secondary">
            {corridor ? `${windowLabel(corridor, t)} · ${tierLabel}` : tierLabel}
          </p>
        </div>
        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
      </div>

      {isActive && contract.trigger_condition && kind !== 'other' && (
        <div className="mt-4 rounded-m bg-surface-raised p-4">
          <LiveCondition
            contract={{ trigger_type: contract.trigger_type, trigger_condition: contract.trigger_condition, corridor: corridor ? { window_start: corridor.window_start, window_end: corridor.window_end, baseline_duration_s: corridor.baseline_duration_s ?? null } : null }}
            reading={position.latest_reading ?? null}
            compact
            owned
            showBadge={false}
          />
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <div>
          <dt className="text-caption text-ink-muted">{t('dashboard.paidLabel')}</dt>
          <dd className="font-display text-[26px] leading-tight text-ink">{money(premium_paid_usd, currency)}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-muted">{isActive ? t('dashboard.receiveLabel') : t('dashboard.receivedLabel')}</dt>
          <dd className="font-display text-[26px] leading-tight text-pay">{money(receiveLeft, currency)}</dd>
        </div>
        <div>
          <dt className="text-caption text-ink-muted">{isActive ? t('dashboard.endsLabel') : t('dashboard.endedLabel')}</dt>
          <dd className="font-display text-[26px] leading-tight text-ink">{formatShortDay(expires_at, locale)}</dd>
        </div>
      </dl>

      {isActive && (
        <div className="mt-4 space-y-1.5">
          <DayStrip total={total} current={current} label={`${t('dashboard.dayStrip')}: ${progress}`} />
          <p className="text-caption text-ink-muted">{progress}</p>
        </div>
      )}
    </Link>
  )
}
