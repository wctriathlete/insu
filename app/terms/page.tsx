import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import Header from '@/components/layout/Header'
import { Eyebrow, DisplayTitle } from '@/components/sereno/Typography'
import { Alert } from '@/components/sereno/Alert'
import { TERMS } from '@/lib/legal/terms'
import type { Locale } from '@/i18n/config'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('terms')
  return { title: `${t('title')} — Insu` }
}

export default async function TermsPage() {
  const t = await getTranslations('terms')
  const locale = (await getLocale()) as Locale
  const note = t('reviewNote')

  return (
    <>
      <Header hideSearch />
      <main className="mx-auto w-full max-w-[720px] px-5 pb-14 pt-8">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <DisplayTitle size="l" className="mt-2">{t('title')}</DisplayTitle>
        <p className="mt-3 text-body-s text-ink-muted">{t('updated')}</p>
        {note && <Alert tone="info" className="mt-5">{note}</Alert>}
        <div className="mt-8 space-y-8">
          {TERMS[locale].map((section) => (
            <section key={section.title}>
              <h2 className="text-title text-ink">{section.title}</h2>
              <div className="mt-2 space-y-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-body text-ink-secondary">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  )
}
