'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { formatDay, money } from '@/lib/format'
import { contractFullName, productKind } from '@/lib/contracts/display'
import { resolveDisplayCurrency } from '@/lib/currency/resolve'
import type { DisplayMode } from '@/lib/currency/config'
import type { PayoutWithContract } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import { StatusBadge } from '@/components/sereno/StatusBadge'
import { ProductIcon } from '@/components/sereno/ProductIcon'

/** A payout in "Pagadas"; opens the payout moment. */
export function PayoutRow({ payout, displayMode }: { payout: PayoutWithContract; displayMode: DisplayMode }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const { contract, amount_usd, status, created_at, completed_at } = payout
  const currency = resolveDisplayCurrency(displayMode, contract.location?.country)
  const done = status === 'completed'

  return (
    <Link
      href={`/payouts/${payout.id}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong"
    >
      <ProductIcon kind={productKind(contract)} />
      <div className="min-w-0 flex-1">
        <p className="text-body-s font-bold text-ink">{contractFullName(contract, locale, t)}</p>
        <p className="text-caption text-ink-muted">{t('dashboard.paidOn', { date: formatDay(completed_at ?? created_at, locale) })}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-display text-[26px] leading-none text-pay">{money(amount_usd, currency)}</span>
        <StatusBadge tone={done ? 'success' : 'info'}>{done ? t('status.paid') : t('status.processing')}</StatusBadge>
      </div>
    </Link>
  )
}
