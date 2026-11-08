'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { setLocale } from '@/lib/actions/preferences'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

/** ES · EN switch. Persists to a cookie (and the profile) and re-renders in place. */
export default function LanguageToggle({ className }: { className?: string }) {
  const t = useTranslations('common')
  const locale = useLocale() as Locale
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(next: Locale) {
    if (next === locale) return
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <div role="group" aria-label={t('languageToggle')} className={cn('flex items-center', className)}>
      {(['es', 'en'] as const).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden className="px-0.5 text-ink-muted">·</span>}
          <button
            type="button"
            onClick={() => choose(l)}
            disabled={pending}
            aria-pressed={l === locale}
            lang={l}
            aria-label={l === 'es' ? t('spanish') : t('english')}
            className={cn(
              'flex min-h-touch min-w-[36px] items-center justify-center rounded-full text-body-s',
              l === locale ? 'font-extrabold text-ink' : 'font-semibold text-ink-muted hover:text-ink',
            )}
          >
            {t(l)}
          </button>
        </span>
      ))}
    </div>
  )
}
