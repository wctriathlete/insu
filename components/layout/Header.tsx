import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Bell, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUnreadCount } from '@/lib/actions/notifications'
import { InsuLogo } from '@/components/sereno/Logo'
import SearchInput from './SearchInput'
import LanguageToggle from './LanguageToggle'
import { cn } from '@/lib/utils'

interface Props {
  /** Phone top row shows a back button instead of the logo. */
  back?: { href: string }
  /** Hide the desktop search field (it only filters the home page). */
  hideSearch?: boolean
}

const iconBtn =
  'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink hover:bg-surface-raised'

/**
 * Global chrome (handoff §6.1). Phones get a plain top row — back or logo,
 * ES · EN, avisos, profile — with no sticky blurred bar; the TabBar handles
 * navigation. Desktop gets logo + nav + secondary search + auth actions.
 */
export default async function Header({ back, hideSearch }: Props = {}) {
  const t = await getTranslations('nav')
  const tc = await getTranslations('common')

  let userId: string | null = null
  let isAdmin = false
  let unread = 0
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
    if (userId) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
      isAdmin = (profile as { role: string } | null)?.role === 'admin'
      unread = await getUnreadCount()
    }
  } catch {
    // Supabase not configured — render the signed-out header
  }

  const bell = userId ? (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? t('notificationsUnread', { count: unread }) : t('notifications')}
      className={iconBtn}
    >
      <Bell size={20} aria-hidden />
      {unread > 0 && <span aria-hidden className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-sky ring-2 ring-surface" />}
    </Link>
  ) : null

  return (
    <header className="border-b border-border bg-surface">
      {/* Phone top row */}
      <div className="flex h-16 items-center gap-2 px-5 md:hidden">
        {back ? (
          <Link href={back.href} aria-label={tc('back')} className={iconBtn}>
            <ArrowLeft size={20} aria-hidden />
          </Link>
        ) : (
          <Link href="/" aria-label={t('logoHome')} className="flex min-h-touch items-center">
            <InsuLogo />
          </Link>
        )}
        <div className="flex-1" />
        <LanguageToggle />
        {bell}
        <Link href={userId ? '/profile' : '/auth/login'} aria-label={userId ? t('profile') : t('login')} className={iconBtn}>
          <User size={20} aria-hidden />
        </Link>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden h-[72px] max-w-[1200px] items-center gap-6 px-6 md:flex">
        <Link href="/" aria-label={t('logoHome')} className="flex min-h-touch shrink-0 items-center">
          <InsuLogo />
        </Link>
        <nav aria-label={t('main')} className="flex items-center gap-1">
          {[
            { href: '/', label: t('browse') },
            { href: '/how-it-works', label: t('howItWorks') },
            { href: '/earn', label: t('earn') },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex min-h-touch items-center rounded-full px-3 text-body-s font-bold text-ink-secondary hover:bg-surface-raised hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex min-h-touch items-center rounded-full px-3 text-body-s font-bold text-ink-muted hover:bg-surface-raised hover:text-ink"
            >
              {t('admin')}
            </Link>
          )}
        </nav>

        <div className="flex-1" />

        {!hideSearch && (
          <div className="flex h-11 w-full max-w-[260px] items-center gap-2 rounded-full border border-border-strong bg-bg px-4 focus-within:border-sky">
            <SearchInput />
          </div>
        )}

        <LanguageToggle />

        {userId ? (
          <div className="flex items-center gap-2">
            {bell}
            <Link
              href="/dashboard"
              className="flex min-h-touch items-center rounded-full px-3 text-body-s font-bold text-ink hover:bg-surface-raised"
            >
              {t('protections')}
            </Link>
            <Link href="/profile" aria-label={t('profile')} className={iconBtn}>
              <User size={20} aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="flex min-h-touch items-center rounded-full px-3 text-body-s font-bold text-ink hover:bg-surface-raised"
            >
              {t('login')}
            </Link>
            <Link
              href="/auth/signup"
              className={cn('flex h-11 items-center rounded-full bg-panel px-5 text-body-s font-extrabold text-on-panel hover:opacity-90')}
            >
              {t('signup')}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
