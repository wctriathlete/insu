'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { contractEyebrow, contractName, productKind, windowLabel } from '@/lib/contracts/display'
import { formatMoney } from '@/lib/utils'
import type { ContractWithTiers } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import { ProductIcon } from '@/components/sereno/ProductIcon'
import { StatusBadge } from '@/components/sereno/StatusBadge'

/** "Fondos abiertos" card: what it backs, how often it fired, how full the pool is. */
export default function PoolCard({ contract, activations }: { contract: ContractWithTiers; activations: number }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const current = contract.coverage_tiers.reduce((s, x) => s + Number(x.current_capacity_usd), 0)
  const max = contract.coverage_tiers.reduce((s, x) => s + Number(x.max_capacity_usd), 0)
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  const full = max > 0 && current >= max
  const payout = Math.min(...contract.coverage_tiers.map((x) => Number(x.payout_usd)))

  return (
    <article className="relative rounded-card border border-border bg-surface p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3">
        <ProductIcon kind={productKind(contract)} />
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow uppercase text-sky-deep">{contractEyebrow(contract, t)}</p>
          <h3 className="mt-0.5 text-title text-ink">
            <Link href={`/earn/${contract.slug}`} className="after:absolute after:inset-0 after:rounded-card after:content-['']">
              {contractName(contract, locale, t)}
            </Link>
          </h3>
          {contract.corridor && <p className="text-body-s text-ink-secondary">{windowLabel(contract.corridor, t)}</p>}
        </div>
        {full ? <StatusBadge tone="neutral">{t('earn.full')}</StatusBadge> : current > 0 ? <StatusBadge tone="success">{t('status.backed')}</StatusBadge> : null}
      </div>
      <ul className="mt-3 space-y-1 text-body-s text-ink-secondary">
        <li>{t('earn.activated', { count: activations })}</li>
        {Number.isFinite(payout) && <li>{t('earn.payoutPer', { amount: formatMoney(payout, 'USD') })}</li>}
      </ul>
      {max > 0 && (
        <div className="mt-4">
          <div
            role="img"
            aria-label={t('earn.backed', { current: formatMoney(current, 'USD'), max: formatMoney(max, 'USD') })}
            className="h-2 rounded-full bg-track"
          >
            <div className="h-full rounded-full bg-sky" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-caption text-ink-muted">
            {t('earn.backed', { current: formatMoney(current, 'USD'), max: formatMoney(max, 'USD') })}
          </p>
        </div>
      )}
    </article>
  )
}
