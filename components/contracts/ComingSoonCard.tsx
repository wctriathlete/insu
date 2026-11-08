'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { cityLabel, contractName, productKind } from '@/lib/contracts/display'
import type { ContractWithTiers } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import { ProductIcon } from '@/components/sereno/ProductIcon'
import { StatusBadge } from '@/components/sereno/StatusBadge'

/** Muy pronto teaser: name and place, never a price. */
export default function ComingSoonCard({ contract }: { contract: ContractWithTiers }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  return (
    <Link
      href={`/markets/${contract.slug}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong"
    >
      <ProductIcon kind={productKind(contract)} />
      <div className="min-w-0 flex-1">
        <p className="text-body-s font-bold text-ink">{contractName(contract, locale, t)}</p>
        <p className="text-caption text-ink-muted">{cityLabel(contract, t)}</p>
      </div>
      <StatusBadge tone="neutral">{t('status.soon')}</StatusBadge>
    </Link>
  )
}
