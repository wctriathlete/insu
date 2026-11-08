import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Header from '@/components/layout/Header'
import { Eyebrow, DisplayTitle, emphasis } from '@/components/sereno/Typography'
import { ButtonLink } from '@/components/sereno/Button'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('howItWorks')
  return { title: `${t('eyebrow')} — Insu` }
}

/**
 * Cómo funciona (handoff §8.3). Rewritten around the three steps and only
 * claims the product backs: $5 floor, daily repricing, the actual sources, no
 * promised settlement time.
 */
export default async function HowItWorksPage() {
  const t = await getTranslations()

  return (
    <>
      <Header hideSearch />
      <main className="mx-auto w-full max-w-[1000px] px-5 pb-14 pt-6 md:px-6 md:pt-10">
        <section className="rounded-xl bg-mist p-6 md:rounded-2xl md:p-10">
          <Eyebrow>{t('howItWorks.eyebrow')}</Eyebrow>
          <DisplayTitle size="xl" className="mt-3">{t.rich('howItWorks.title', emphasis)}</DisplayTitle>
          <p className="mt-4 max-w-[640px] text-body text-ink-secondary">{t('howItWorks.intro')}</p>
          <ButtonLink href="/" size="main" className="mt-6">{t('howItWorks.cta')}</ButtonLink>
        </section>

        <section aria-labelledby="steps" className="mt-10">
          <h2 id="steps" className="font-display text-display-s text-ink">{t('howItWorks.stepsTitle')}</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {([1, 2, 3] as const).map((n) => (
              <li key={n} className="rounded-card border border-border bg-surface p-5">
                <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-body-s font-extrabold text-sky">
                  {n}
                </span>
                <p className="mt-3 text-title text-ink">{t(`home.step${n}Title`)}</p>
                <p className="mt-1 text-body-s text-ink-secondary">{t(`home.step${n}Body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="facts" className="mt-10">
          <h2 id="facts" className="font-display text-display-s text-ink">{t('howItWorks.factsTitle')}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {([1, 2, 3, 4] as const).map((n) => (
              <div key={n} className="rounded-card border border-border bg-surface p-5">
                <dt className="text-title text-ink">{t(`howItWorks.fact${n}Title`)}</dt>
                <dd className="mt-1 text-body-s text-ink-secondary">{t(`howItWorks.fact${n}Body`)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10 rounded-xl bg-panel p-6 text-on-panel md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <div>
            <h2 className="font-display text-display-s">{t('howItWorks.earnTitle')}</h2>
            <p className="mt-2 max-w-[560px] text-body text-on-panel-muted">{t('howItWorks.earnBody')}</p>
          </div>
          <ButtonLink href="/earn" variant="sun" size="main" className="mt-4 w-full md:mt-0 md:w-auto">
            {t('howItWorks.earnCta')}
          </ButtonLink>
        </section>
      </main>
    </>
  )
}
