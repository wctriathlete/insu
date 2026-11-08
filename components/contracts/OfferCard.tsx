'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { contractEyebrow, contractName, productKind, windowLabel } from '@/lib/contracts/display'
import { conditionView } from '@/lib/contracts/conditions'
import { displayPrice } from '@/lib/currency/resolve'
import { formatMoney } from '@/lib/utils'
import type { ContractWithTiers, LatestOracleReading } from '@/lib/types'
import type { DisplayMode } from '@/lib/currency/config'
import type { Locale } from '@/i18n/config'
import { ProductIcon } from '@/components/sereno/ProductIcon'
import { StatusBadge } from '@/components/sereno/StatusBadge'
import LiveCondition, { conditionBadge } from '@/components/sereno/LiveCondition'

interface Props {
  contract: ContractWithTiers
  reading: LatestOracleReading | null
  displayMode: DisplayMode
  /** Mañana · Tarde switch for corridor pairs (layered above the card link). */
  windowSwitch?: React.ReactNode
}

/**
 * Offer ProtectionCard (handoff §5): icon chip, title, status word, live meter
 * and the deal line. The whole card is one link (stretched from the title);
 * there's no "Buy now" button.
 */
export default function OfferCard({ contract, reading, displayMode, windowSwitch }: Props) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const kind = productKind(contract)
  const basic = [...contract.coverage_tiers].sort((a, b) => (a.name === 'basic' ? -1 : b.name === 'basic' ? 1 : 0))[0]
  const badge = conditionBadge(conditionView(contract, reading), t)
  const fmt = (usd: number) => {
    const p = displayPrice(usd, displayMode, contract.location?.country)
    return formatMoney(p.amount, p.currency)
  }

  return (
    <article className="relative flex flex-col rounded-card border border-border bg-surface p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3">
        <ProductIcon kind={kind} />
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow uppercase text-sky-deep">{contractEyebrow(contract, t)}</p>
          <h3 className="mt-0.5 text-title text-ink">
            <Link
              href={`/markets/${contract.slug}`}
              className="after:absolute after:inset-0 after:rounded-card after:content-['']"
            >
              {contractName(contract, locale, t)}
            </Link>
          </h3>
          {contract.corridor && <p className="text-body-s text-ink-secondary">{windowLabel(contract.corridor, t)}</p>}
        </div>
        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
      </div>

      {windowSwitch && <div className="relative z-10 mt-3">{windowSwitch}</div>}

      <div className="mt-4">
        <LiveCondition contract={contract} reading={reading} compact showBadge={false} />
      </div>

      {basic && (
        <p className="mt-4 border-t border-border pt-3 text-body-s font-bold text-ink">
          {t('deal.from', { price: fmt(basic.premium_usd), payout: fmt(basic.payout_usd) })}
        </p>
      )}
    </article>
  )
}
