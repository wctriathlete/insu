'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { contractFullName } from '@/lib/contracts/display'
import { formatMoney } from '@/lib/utils'
import type { ProviderPositionWithContract } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import { StatusBadge } from '@/components/sereno/StatusBadge'

/** One of the person's capital contributions (moved here from the old Positions tab). */
export default function CapitalCard({ position }: { position: ProviderPositionWithContract }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const settled = position.status === 'settled'
  const returned = position.actual_return_usd

  return (
    <Link
      href={`/earn/${position.contract.slug}`}
      className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong"
    >
      <div className="min-w-0">
        <p className="text-body-s font-bold text-ink">{contractFullName(position.contract, locale, t)}</p>
        <p className="text-caption text-ink-muted">
          {t('earn.contributed')} {formatMoney(position.capital_deposited_usd, 'USD')}
          {settled && returned != null && ` · ${t('earn.returned')} ${formatMoney(returned, 'USD')}`}
        </p>
      </div>
      <StatusBadge tone={settled ? 'neutral' : 'success'}>{settled ? t('earn.settled') : t('status.backed')}</StatusBadge>
    </Link>
  )
}
