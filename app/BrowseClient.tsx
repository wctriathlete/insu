'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRealtimeContracts } from '@/hooks/useRealtimeContracts'
import { partitionByLaunchStage, homeSections } from '@/lib/launch'
import { conditionView } from '@/lib/contracts/conditions'
import { cityLabel, contractName, citySlugOf, productKind } from '@/lib/contracts/display'
import { useSearch } from '@/lib/search-context'
import type { CitySlug, ContractWithTiers, LatestOracleReading } from '@/lib/types'
import type { DisplayMode } from '@/lib/currency/config'
import type { Locale } from '@/i18n/config'
import { Eyebrow, DisplayTitle, emphasis } from '@/components/sereno/Typography'
import { SegmentedControl } from '@/components/sereno/SegmentedControl'
import { ButtonLink } from '@/components/sereno/Button'
import OfferCard from '@/components/contracts/OfferCard'
import RouteCard from '@/components/contracts/RouteCard'
import ComingSoonCard from '@/components/contracts/ComingSoonCard'
import { ProductIcon } from '@/components/sereno/ProductIcon'
import { StatusBadge } from '@/components/sereno/StatusBadge'
import { conditionBadge, readingLine } from '@/components/sereno/LiveCondition'

interface Props {
  initialContracts: ContractWithTiers[]
  readings: Record<string, LatestOracleReading | null>
  displayMode: DisplayMode
}

const CITIES: CitySlug[] = ['cdmx', 'guatemala_city']

/**
 * Home (handoff §6.2): a calm hero with the city's live state, one offer per
 * thing we watch there, a CTA panel and what's coming. No stats bar, volume,
 * trending row or "Buy now" buttons.
 */
export default function BrowseClient({ initialContracts, readings, displayMode }: Props) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const [city, setCity] = useState<CitySlug>('cdmx')
  const contracts = useRealtimeContracts(initialContracts)
  const { live, comingSoon } = useMemo(() => partitionByLaunchStage(contracts), [contracts])
  const { routes, others } = useMemo(() => homeSections(live, city), [live, city])
  const { query } = useSearch()
  const cityName = t(`cities.${city}`)

  // Hero state from the readings we actually have for this city.
  const states = live
    .filter((c) => citySlugOf(c) === city)
    .map((c) => conditionView(c, readings[c.id] ?? null))
    .filter((v) => v.meter && !v.stale)
    .map((v) => v.meter!.state)
  const mood = states.includes('crossed') ? 'crossed' : states.includes('heavy') ? 'heavy' : 'calm'

  const q = query.trim().toLowerCase()
  const results = q
    ? contracts.filter((c) =>
        [contractName(c, locale, t), cityLabel(c, t), c.corridor?.road ?? '', c.location?.city ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    : []

  const cityControl = (
    <SegmentedControl
      label={t('home.cityLabel')}
      tone="city"
      value={city}
      onChange={setCity}
      options={CITIES.map((c) => ({ value: c, label: t(`cities.${c}`) }))}
    />
  )

  if (q) {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-5 py-6 md:px-6">
        <p className="text-label text-ink">{t('home.searchResults', { count: results.length, query })}</p>
        {results.length === 0 ? (
          <p className="mt-4 text-body text-ink-secondary">{t('home.searchEmpty')}</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((c) =>
              c.launch_stage === 'coming_soon' ? (
                <ComingSoonCard key={c.id} contract={c} />
              ) : (
                <OfferCard key={c.id} contract={c} reading={readings[c.id] ?? null} displayMode={displayMode} />
              ),
            )}
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 pb-10 pt-5 md:px-6 md:pt-8">
      {/* 1. Mist hero */}
      <section className="rounded-xl bg-mist p-5 md:grid md:grid-cols-[1.2fr_1fr] md:gap-10 md:rounded-2xl md:p-10">
        <div>
          <Eyebrow>{t('home.eyebrow', { city: cityName })}</Eyebrow>
          <DisplayTitle size="m" className="mt-2 md:hidden">
            {t.rich(`home.${mood}Title`, emphasis)}
          </DisplayTitle>
          <DisplayTitle size="l" className="mt-3 hidden md:block lg:text-display-xl">
            {t.rich('home.heroTitle', emphasis)}
          </DisplayTitle>
          <p className="mt-3 text-body text-sky-deep md:hidden">
            {t(mood === 'calm' ? 'home.calmBody' : 'home.heavyBody', { city: cityName })}
          </p>
          <p className="mt-4 hidden max-w-[520px] text-body text-ink-secondary md:block">{t('home.heroBody')}</p>
          <div className="mt-5 max-w-[420px]">{cityControl}</div>
        </div>
        <div className="mt-6 hidden rounded-card bg-surface p-5 md:mt-0 md:block">
          <p className="text-eyebrow uppercase text-ink-muted">{t('home.liveNow', { city: cityName })}</p>
          <p className="mt-2 font-display text-display-s text-ink">{t.rich(`home.${mood}Title`, emphasis)}</p>
          <ul className="mt-4 divide-y divide-border">
            {others.map((c) => {
              const view = conditionView(c, readings[c.id] ?? null)
              const badge = conditionBadge(view, t)
              const line = readingLine(view, t)
              return (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <ProductIcon kind={productKind(c)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-s font-bold text-ink">{contractName(c, locale, t)}</p>
                    {line && <p className="text-caption text-ink-muted">{line}</p>}
                  </div>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                </li>
              )
            })}
            {routes.length > 0 && (
              <li className="flex items-center gap-3 py-3">
                <ProductIcon kind="traffic" />
                <p className="min-w-0 flex-1 text-body-s font-bold text-ink">
                  {t('home.routesWatched', { count: routes.length })}
                </p>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* Desktop: 3 steps */}
      <section aria-labelledby="steps" className="mt-10 hidden md:block">
        <h2 id="steps" className="font-display text-display-s text-ink">{t('home.stepsTitle')}</h2>
        <ol className="mt-4 grid grid-cols-3 gap-4">
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

      {/* 2. One offer per thing we watch */}
      {routes.length === 0 && others.length === 0 ? (
        <p className="mt-8 text-body text-ink-secondary">{t('home.noContracts')}</p>
      ) : (
        <>
          {routes.length > 0 && (
            <section id="trayecto" aria-labelledby="routes-title" className="mt-8 scroll-mt-6">
              <h2 id="routes-title" className="font-display text-display-s text-ink">{t('home.trafficSection')}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {routes.map((pair) => (
                  <RouteCard key={pair.road} pair={pair} readings={readings} displayMode={displayMode} />
                ))}
              </div>
            </section>
          )}
          {others.length > 0 && (
            <section aria-labelledby="others-title" className="mt-8">
              <h2 id="others-title" className="font-display text-display-s text-ink">{t('home.otherSection')}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((c) => (
                  <OfferCard key={c.id} contract={c} reading={readings[c.id] ?? null} displayMode={displayMode} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* 3. Panel CTA */}
      {routes.length > 0 && (
        <section className="mt-8 rounded-xl bg-panel p-6 text-on-panel md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <div>
            <h2 className="font-display text-display-s">{t('home.panelTitle')}</h2>
            <p className="mt-2 max-w-[560px] text-body text-on-panel-muted">{t('home.panelBody')}</p>
          </div>
          <ButtonLink href="#trayecto" variant="sun" size="main" className="mt-4 w-full md:mt-0 md:w-auto">
            {t('home.panelCta')}
          </ButtonLink>
        </section>
      )}

      {/* Coming soon */}
      {comingSoon.length > 0 && (
        <section aria-labelledby="soon-title" className="mt-10">
          <h2 id="soon-title" className="font-display text-display-s text-ink">{t('home.comingSoon')}</h2>
          <p className="mt-1 text-body text-ink-secondary">{t('home.comingSoonBody')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comingSoon.map((c) => (
              <ComingSoonCard key={c.id} contract={c} />
            ))}
          </div>
          <ButtonLink href="/submit" variant="link" className="mt-3">
            {t('home.propose')} →
          </ButtonLink>
        </section>
      )}
    </main>
  )
}
