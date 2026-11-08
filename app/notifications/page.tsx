import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Bell, CircleCheck, Clock, Coins, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNotifications, markAllRead } from '@/lib/actions/notifications'
import { contractFullName } from '@/lib/contracts/display'
import { marketDayOf } from '@/lib/format'
import type { Notification, NotificationType } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import Header from '@/components/layout/Header'
import { DisplayTitle } from '@/components/sereno/Typography'
import { cn } from '@/lib/utils'

const ICONS: Record<NotificationType, { Icon: LucideIcon; cls: string }> = {
  coverage_paid: { Icon: CircleCheck, cls: 'bg-pay-bg text-pay-ink' },
  coverage_expired: { Icon: Clock, cls: 'bg-track text-ink-secondary' },
  protection_purchased: { Icon: ShieldCheck, cls: 'bg-surface-raised text-sky' },
  provider_settled: { Icon: Coins, cls: 'bg-surface-raised text-sky' },
  product_launched: { Icon: Sparkles, cls: 'bg-caution-bg text-caution-ink' },
}

/**
 * Avisos (handoff §6.11): full screen, grouped Hoy / Esta semana / Antes.
 * Text is rendered from the notification type + contract name in the reader's
 * locale (stored title/body are English and only a fallback).
 */
export default async function NotificationsPage() {
  const t = await getTranslations()
  const locale = (await getLocale()) as Locale
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/notifications')

  const items = await getNotifications(60)

  // Payout notifications open the payout moment: map each to its payout.
  const { data: payouts } = await supabase
    .from('payouts')
    .select('id, contract_id, created_at, hedger_position:hedger_positions!inner(user_id)')
    .eq('hedger_position.user_id', user.id)
    .order('created_at', { ascending: false })
  const payoutFor = (n: Notification) =>
    ((payouts ?? []) as { id: string; contract_id: string; created_at: string }[]).find(
      (p) => p.contract_id === n.contract_id && p.created_at <= n.created_at,
    )?.id

  await markAllRead()

  const now = new Date()
  const today = marketDayOf(now)
  const weekAgo = marketDayOf(new Date(now.getTime() - 6 * 86_400_000))
  const groups: { key: 'today' | 'thisWeek' | 'earlier'; items: Notification[] }[] = [
    { key: 'today', items: [] },
    { key: 'thisWeek', items: [] },
    { key: 'earlier', items: [] },
  ]
  for (const n of items) {
    const day = marketDayOf(n.created_at)
    groups[day === today ? 0 : day >= weekAgo ? 1 : 2].items.push(n)
  }

  function text(n: Notification): string {
    const name = n.contract?.trigger_type ? contractFullName(n.contract, locale, t) : null
    if (!name) return n.title
    return t.has(`notifications.${n.type}`) ? t(`notifications.${n.type}`, { name }) : t('notifications.fallback', { name })
  }

  function ago(iso: string): string {
    const m = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
    if (m < 1) return t('notifications.justNow')
    if (m < 60) return t('notifications.minutesAgo', { count: m })
    const h = Math.floor(m / 60)
    if (h < 24) return t('notifications.hoursAgo', { count: h })
    return t('notifications.daysAgo', { count: Math.floor(h / 24) })
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[640px] px-5 pb-10 pt-6">
        <DisplayTitle size="m">{t('notifications.title')}</DisplayTitle>
        {items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <Bell size={28} className="text-ink-muted" aria-hidden />
            <p className="text-body text-ink-secondary">{t('notifications.empty')}</p>
          </div>
        ) : (
          groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <section key={g.key} className="mt-6">
                <h2 className="text-eyebrow uppercase text-ink-muted">{t(`notifications.${g.key}`)}</h2>
                <ul className="mt-2 space-y-2">
                  {g.items.map((n) => {
                    const { Icon, cls } = ICONS[n.type] ?? ICONS.protection_purchased
                    const payoutId = n.type === 'coverage_paid' ? payoutFor(n) : undefined
                    const href = payoutId ? `/payouts/${payoutId}` : n.contract?.slug ? `/markets/${n.contract.slug}` : null
                    const unread = !n.read_at
                    const body = (
                      <div className="flex items-start gap-3 rounded-card border border-border bg-surface p-4">
                        <span aria-hidden className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cls)}>
                          <Icon size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-body-s text-ink', unread ? 'font-extrabold' : 'font-semibold')}>{text(n)}</p>
                          <p className="mt-0.5 text-caption text-ink-muted">{ago(n.created_at)}</p>
                        </div>
                        {unread && (
                          <span className="flex items-center gap-1.5 text-caption font-extrabold text-sky">
                            <span aria-hidden className="h-2 w-2 rounded-full bg-sky" />
                            {t('common.new')}
                          </span>
                        )}
                      </div>
                    )
                    return (
                      <li key={n.id}>
                        {href ? (
                          <Link href={href} className="block hover:opacity-90">
                            {body}
                          </Link>
                        ) : (
                          body
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
        )}
      </main>
    </>
  )
}
