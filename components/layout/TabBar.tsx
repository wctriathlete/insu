'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Coins, House, Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', key: 'home', Icon: House, match: (p: string) => p === '/' },
  { href: '/dashboard', key: 'protections', Icon: Shield, match: (p: string) => p.startsWith('/dashboard') },
  { href: '/earn', key: 'earn', Icon: Coins, match: (p: string) => p.startsWith('/earn') },
  { href: '/profile', key: 'profile', Icon: User, match: (p: string) => p.startsWith('/profile') },
] as const

/** Screens that carry the bar (handoff §6.1); checkout and moments don't. */
const SHOWN_ON = ['/', '/dashboard', '/earn', '/profile', '/notifications']

/**
 * Phone-only bottom navigation (Inicio · Mis protecciones · Ganar · Perfil).
 * Desktop uses the header nav instead. Rendered once by the root layout after
 * the footer, with a spacer so the footer never sits under the bar.
 */
export default function TabBar() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  if (!SHOWN_ON.includes(pathname)) return null

  return (
    <>
      <div aria-hidden className="h-[76px] md:hidden" />
      <nav
        aria-label={t('main')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto flex max-w-[520px]">
          {TABS.map(({ href, key, Icon, match }) => {
            const active = match(pathname)
            return (
              <li key={key} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-center text-caption leading-tight',
                    active ? 'font-extrabold text-sky' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <Icon size={22} strokeWidth={2} aria-hidden />
                  {t(key)}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
