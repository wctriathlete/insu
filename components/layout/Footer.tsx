import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

/** Every page: "Insu no es una aseguradora." + Cómo funciona + Términos (handoff §6.1). */
export default async function Footer() {
  const t = await getTranslations('footer')
  return (
    <footer className="border-t border-border px-5 py-8 md:px-6">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-body-s font-bold text-ink">{t('notInsurer')}</p>
        <p className="mt-1 max-w-[680px] text-caption text-ink-muted">{t('disclaimer')}</p>
        <nav className="mt-3 flex flex-wrap gap-x-5">
          <Link href="/how-it-works" className="flex min-h-touch items-center text-body-s font-bold text-sky hover:text-sky-deep">
            {t('howItWorks')}
          </Link>
          <Link href="/terms" className="flex min-h-touch items-center text-body-s font-bold text-sky hover:text-sky-deep">
            {t('terms')}
          </Link>
        </nav>
        <p className="mt-2 text-caption text-ink-muted">{t('rights', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  )
}
