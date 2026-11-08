'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toggleLaunchInterest } from '@/lib/actions/launch-interest'
import { cityLabel, contractDescription, contractName } from '@/lib/contracts/display'
import type { ContractWithTiers } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import { Eyebrow, DisplayTitle } from '@/components/sereno/Typography'
import { Button, ButtonLink } from '@/components/sereno/Button'
import { Alert } from '@/components/sereno/Alert'

interface Props {
  contract: ContractWithTiers
  userId: string | null
  initiallyInterested: boolean
}

/** Repeating sun-ray + house-outline pattern for the brand header block. */
function BrandPattern() {
  return (
    <svg aria-hidden className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="insu-pattern" width="132" height="80" patternUnits="userSpaceOnUse">
          <path d="M58 14 H86 L122 48 V72 H94 L58 38 Z" fill="var(--sun)" opacity="0.9" />
          <path d="M10 40 L36 16 L62 40 V70 H10 Z" fill="none" stroke="var(--sky)" strokeWidth="5" strokeLinejoin="round" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#insu-pattern)" />
    </svg>
  )
}

/**
 * "Muy pronto" (handoff §6.11): always dark, no prices. Notify-me uses the
 * launch_interest table; the launch fan-out already exists in admin.
 */
export default function ComingSoonScreen({ contract, userId, initiallyInterested }: Props) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const [interested, setInterested] = useState(initiallyInterested)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()
  const description = contractDescription(contract, locale)
  const city = cityLabel(contract, t)

  return (
    <main className="mx-auto w-full max-w-[640px] px-5 pb-12 pt-6">
      <div className="h-28 overflow-hidden rounded-card bg-panel">
        <BrandPattern />
      </div>
      <Eyebrow className="mt-6">
        {t('comingSoon.eyebrow')}
        {city ? ` · ${city}` : ''}
      </Eyebrow>
      <DisplayTitle size="m" className="mt-2">
        {contractName(contract, locale, t)}
      </DisplayTitle>

      {description && (
        <section className="mt-6">
          <h2 className="text-title text-ink">{t('comingSoon.whatTitle')}</h2>
          <p className="mt-1 text-body text-ink-secondary">{description}</p>
        </section>
      )}

      <section className="mt-6 rounded-card border border-border bg-surface p-5">
        <h2 className="text-title text-ink">{t('comingSoon.stepsTitle')}</h2>
        <ol className="mt-3 space-y-3">
          {(['step1', 'step2', 'step3'] as const).map((k, i) => (
            <li key={k} className="flex gap-3 text-body text-ink-secondary">
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-raised text-body-s font-extrabold text-sky"
              >
                {i + 1}
              </span>
              {t(`comingSoon.${k}`)}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 space-y-3">
        {error && <Alert tone="danger">{t('common.genericError')}</Alert>}
        {userId ? (
          <Button
            variant="sun"
            size="main"
            block
            aria-pressed={interested}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(false)
                try {
                  setInterested(await toggleLaunchInterest(contract.id))
                } catch {
                  setError(true)
                }
              })
            }
          >
            {interested ? t('comingSoon.notified') : t('comingSoon.notify')}
          </Button>
        ) : (
          <ButtonLink
            variant="sun"
            size="main"
            block
            href={`/auth/signup?next=${encodeURIComponent(`/markets/${contract.slug}`)}&for=${encodeURIComponent(contract.slug)}`}
          >
            {t('comingSoon.signInToNotify')}
          </ButtonLink>
        )}
        <p className="text-body-s text-ink-secondary">
          {t('comingSoon.proposeLine')}{' '}
          <a href="/submit" className="font-bold text-sky hover:text-sky-deep">
            {t('comingSoon.propose')}
          </a>
        </p>
      </div>
    </main>
  )
}
