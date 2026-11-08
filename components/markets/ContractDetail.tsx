'use client'

import { useState } from 'react'
import ContractCheckout, { type DetailBundle, type InitialSelection } from './ContractCheckout'
import type { DisplayMode } from '@/lib/currency/config'

interface Props {
  bundles: DetailBundle[]
  initialSlug: string
  userId: string | null
  displayMode: DisplayMode
  initial?: InitialSelection
  watchingCapacity: boolean
}

/**
 * Holds a corridor's morning/evening bundles and swaps between them client-side
 * (Mañana · Tarde control), keeping the URL in sync via history.replaceState so
 * refresh/share keep the window without a server round-trip.
 */
export default function ContractDetail({ bundles, initialSlug, userId, displayMode, initial, watchingCapacity }: Props) {
  const [activeSlug, setActiveSlug] = useState(initialSlug)
  const active = bundles.find((b) => b.slug === activeSlug) ?? bundles[0]
  const sibling = bundles.find((b) => b.slug !== active.slug) ?? null

  function switchWindow(slug: string) {
    if (!bundles.some((b) => b.slug === slug)) return
    setActiveSlug(slug)
    window.history.replaceState(null, '', `/markets/${slug}`)
  }

  return (
    <ContractCheckout
      key={active.slug}
      bundle={active}
      sibling={sibling}
      onSwitchWindow={switchWindow}
      userId={userId}
      displayMode={displayMode}
      initial={active.slug === initialSlug ? initial : undefined}
      watchingCapacity={watchingCapacity}
    />
  )
}
