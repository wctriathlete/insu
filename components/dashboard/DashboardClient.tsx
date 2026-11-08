'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/lib/actions/profile'
import { localCurrencyForCountry, resolveDisplayCurrency } from '@/lib/currency/resolve'
import { money } from '@/lib/format'
import type { DisplayMode } from '@/lib/currency/config'
import type { HedgerPositionWithContract, PayoutWithContract } from '@/lib/types'
import { DisplayTitle } from '@/components/sereno/Typography'
import { SegmentedControl } from '@/components/sereno/SegmentedControl'
import { ButtonLink } from '@/components/sereno/Button'
import { EmptyHouse } from '@/components/sereno/Logo'
import { ProtectionCard } from './ProtectionCard'
import { PayoutRow } from './PayoutRow'

export type DashboardTab = 'active' | 'paid' | 'ended'

interface Props {
  userId: string
  hedgerPositions: HedgerPositionWithContract[]
  payouts: PayoutWithContract[]
  initialTab: DashboardTab
  displayMode: DisplayMode
}

/**
 * Mis protecciones (handoff §6.7). Activas · Pagadas · Terminadas, a summary
 * panel, the USD · local toggle, and Supabase realtime updates on positions.
 * Capital-provider positions live in Ganar now.
 */
export function DashboardClient({ userId, hedgerPositions: initial, payouts, initialTab, displayMode }: Props) {
  const t = useTranslations()
  const router = useRouter()
  const [tab, setTab] = useState<DashboardTab>(initialTab)
  const [mode, setMode] = useState<DisplayMode>(displayMode)
  const [, startTransition] = useTransition()
  const [positions, setPositions] = useState(initial)

  // Re-sync when the server component re-fetches (router.refresh after an
  // INSERT/DELETE). Render-phase adjustment, not an effect.
  const [synced, setSynced] = useState(initial)
  if (synced !== initial) {
    setSynced(initial)
    setPositions(initial)
  }

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    const channel = supabase
      .channel('dashboard:hedger')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'hedger_positions', filter: `user_id=eq.${userId}` },
        (payload) => setPositions((prev) => prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))),
      )
      // New rows need the contract/tier joins, so re-fetch server-side.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hedger_positions', filter: `user_id=eq.${userId}` },
        () => router.refresh(),
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'hedger_positions' }, () => router.refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, router])

  function chooseTab(next: DashboardTab) {
    setTab(next)
    window.history.replaceState(null, '', `/dashboard?tab=${next}`)
  }

  function chooseMode(next: DisplayMode) {
    setMode(next)
    startTransition(async () => {
      await updateProfile({ preferred_currency: next })
      router.refresh()
    })
  }

  const active = positions.filter((p) => p.status === 'active')
  const ended = positions.filter((p) => p.status === 'expired' || p.status === 'paid_out')

  // "Podrías recibir hasta": every payout still possible on active protections.
  // Shown in local currency only when all of them share one.
  const remainingUsd = active.reduce((sum, p) => sum + p.payout_amount_usd * (p.payouts_remaining ?? p.tier.max_payouts ?? 1), 0)
  const currencies = new Set(active.map((p) => resolveDisplayCurrency(mode, p.contract.location?.country)))
  const panelCurrency = currencies.size === 1 ? [...currencies][0] : 'USD'
  const hasLocal = positions.some((p) => localCurrencyForCountry(p.contract.location?.country))

  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pb-10 pt-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <DisplayTitle size="m">{t('dashboard.title')}</DisplayTitle>
        {hasLocal && (
          <SegmentedControl
            label={t('dashboard.showIn')}
            value={mode}
            onChange={chooseMode}
            className="w-full max-w-[260px]"
            options={[
              { value: 'USD', label: t('dashboard.usd') },
              { value: 'LOCAL', label: t('dashboard.local') },
            ]}
          />
        )}
      </div>

      <section className="mt-5 rounded-xl bg-panel p-5 text-on-panel">
        <p className="text-body font-bold">{t('dashboard.activeCount', { count: active.length })}</p>
        {active.length > 0 && (
          <p className="mt-1 font-display text-amount">
            {t('dashboard.couldReceive', { amount: money(remainingUsd, panelCurrency) })}
          </p>
        )}
        <p className="mt-2 text-caption text-on-panel-muted">{t('common.chargedInUsd')}</p>
      </section>

      <SegmentedControl
        label={t('dashboard.tabs')}
        value={tab}
        onChange={chooseTab}
        className="mt-6"
        options={[
          { value: 'active', label: `${t('dashboard.active')} · ${active.length}` },
          { value: 'paid', label: `${t('dashboard.paid')} · ${payouts.length}` },
          { value: 'ended', label: `${t('dashboard.ended')} · ${ended.length}` },
        ]}
      />

      <div className="mt-5 space-y-3">
        {tab === 'active' &&
          (active.length > 0 ? (
            active.map((p) => <ProtectionCard key={p.id} position={p} displayMode={mode} />)
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-border-strong px-5 py-10 text-center">
              <EmptyHouse />
              <p className="text-body font-bold text-ink">{t('dashboard.empty')}</p>
              <ButtonLink href="/">{t('dashboard.emptyCta')}</ButtonLink>
            </div>
          ))}

        {tab === 'paid' &&
          (payouts.length > 0 ? (
            payouts.map((p) => <PayoutRow key={p.id} payout={p} displayMode={mode} />)
          ) : (
            <p className="py-8 text-center text-body text-ink-secondary">{t('dashboard.emptyPaid')}</p>
          ))}

        {tab === 'ended' &&
          (ended.length > 0 ? (
            ended.map((p) => <ProtectionCard key={p.id} position={p} displayMode={mode} />)
          ) : (
            <p className="py-8 text-center text-body text-ink-secondary">{t('dashboard.emptyEnded')}</p>
          ))}
      </div>
    </main>
  )
}
