'use client'

import { useTranslations } from 'next-intl'
import { DisplayTitle, emphasis } from './Typography'
import { Button, ButtonLink } from './Button'

/** Shared route error boundary body: calm wording, retry + go home. */
export function ErrorState({ reset }: { reset: () => void }) {
  const t = useTranslations('errorPage')
  return (
    <main className="mx-auto max-w-[480px] px-5 py-20 text-center">
      <DisplayTitle size="m">{t.rich('title', emphasis)}</DisplayTitle>
      <p className="mt-3 text-body text-ink-secondary">{t('body')}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>{t('retry')}</Button>
        <ButtonLink href="/" variant="secondary">{t('home')}</ButtonLink>
      </div>
    </main>
  )
}

/** Quiet loading placeholder: static blocks, no shimmer (Sereno is calm). */
export function LoadingBlocks({ label }: { label: string }) {
  return (
    <main aria-busy="true" aria-label={label} className="mx-auto w-full max-w-[720px] space-y-4 px-5 pt-8">
      <div className="h-10 w-2/3 rounded-m bg-track" />
      <div className="h-28 rounded-xl bg-track" />
      <div className="h-48 rounded-card bg-track" />
      <div className="h-48 rounded-card bg-track" />
    </main>
  )
}
