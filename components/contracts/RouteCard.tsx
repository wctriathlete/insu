'use client'

import { useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { upcomingWindow, type RoutePair } from '@/lib/launch'
import type { LatestOracleReading } from '@/lib/types'
import type { DisplayMode } from '@/lib/currency/config'
import { SegmentedControl } from '@/components/sereno/SegmentedControl'
import OfferCard from './OfferCard'

const subscribeNoop = () => () => {}

/** A corridor road as one offer card with a Mañana · Tarde switch. */
export default function RouteCard({
  pair,
  readings,
  displayMode,
}: {
  pair: RoutePair
  readings: Record<string, LatestOracleReading | null>
  displayMode: DisplayMode
}) {
  const t = useTranslations('windows')
  // Time-dependent default only after mount, so SSR and hydration agree.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const [picked, setPicked] = useState<'morning' | 'evening' | null>(null)
  const preferred = picked ?? (mounted ? upcomingWindow() : 'morning')
  const active = pair[preferred] ? preferred : pair.morning ? 'morning' : 'evening'
  const contract = pair[active]
  if (!contract) return null

  return (
    <OfferCard
      contract={contract}
      reading={readings[contract.id] ?? null}
      displayMode={displayMode}
      windowSwitch={
        pair.morning && pair.evening ? (
          <SegmentedControl
            label={t('label')}
            value={active}
            onChange={setPicked}
            options={[
              { value: 'morning', label: t('morningShort') },
              { value: 'evening', label: t('eveningShort') },
            ]}
          />
        ) : undefined
      }
    />
  )
}
