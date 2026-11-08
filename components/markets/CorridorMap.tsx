/// <reference types="@types/google.maps" />
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

declare global {
  interface Window {
    gm_authFailure?: () => void
  }
}

const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#16213a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a9b7d0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#16213a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#243354' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2b3b5e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3b4b70' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1526' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

type MapState = 'loading' | 'ready' | 'error'

export function CorridorMap({
  originLat,
  originLng,
  destLat,
  destLng,
  routeName,
  pathPolyline,
}: {
  originLat: number
  originLng: number
  destLat: number
  destLng: number
  routeName: string
  pathPolyline?: string | null
}) {
  const t = useTranslations('map')
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapState, setMapState] = useState<MapState>('loading')

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
    if (!apiKey || !mapRef.current) {
      setMapState('error')
      return
    }

    let cancelled = false

    // gm_authFailure is called for global script-level auth errors (e.g. invalid key).
    // RefererNotAllowedMapError bypasses it — handled via the tilesloaded timeout below.
    const prevAuthFailure = window.gm_authFailure
    window.gm_authFailure = () => { if (!cancelled) setMapState('error') }

    setOptions({ key: apiKey })

    // If tiles haven't loaded within 5s the key is likely blocked (referrer restriction).
    // The map div stays visibility:hidden the whole time so the Google error overlay
    // is never visible to the user regardless of error type.
    const timer = setTimeout(() => {
      if (!cancelled) setMapState(prev => prev === 'loading' ? 'error' : prev)
    }, 5000)

    Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('core'),
      importLibrary('geometry'),
    ]).then(([mapsLib, markerLib, coreLib, geometryLib]) => {
      if (cancelled || !mapRef.current) return

      const { Map, TrafficLayer, Polyline } = mapsLib as google.maps.MapsLibrary
      const { Marker } = markerLib as google.maps.MarkerLibrary
      const { SymbolPath, LatLngBounds } = coreLib as google.maps.CoreLibrary
      const { encoding } = geometryLib as google.maps.GeometryLibrary

      const midLat = (originLat + destLat) / 2
      const midLng = (originLng + destLng) / 2

      // Follow the page theme: Google's default look in light, a navy style in dark.
      const rootTheme = document.documentElement.dataset.theme
      const dark =
        rootTheme === 'dark' ||
        (rootTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      const css = getComputedStyle(document.documentElement)
      const sky = css.getPropertyValue('--sky').trim() || '#2F6FE4'
      const ink = css.getPropertyValue('--ink').trim() || '#14213D'

      const map = new Map(mapRef.current, {
        center: { lat: midLat, lng: midLng },
        zoom: 12,
        gestureHandling: 'none',
        zoomControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        styles: dark ? DARK_STYLE : LIGHT_STYLE,
      })

      // Reveal the map only after tiles confirm successful auth and render
      map.addListener('tilesloaded', () => {
        if (!cancelled) {
          clearTimeout(timer)
          setMapState('ready')
        }
      })

      new TrafficLayer().setMap(map)

      // Origin and destination are plotted as standalone markers. We intentionally
      // don't draw a connecting line: a straight geodesic line misrepresents the
      // actual road route, and the two endpoints are all the corridor needs to convey.
      new Marker({
        position: { lat: originLat, lng: originLng },
        map,
        title: t('origin'),
        icon: {
          path: SymbolPath.CIRCLE,
          scale: 7,
          fillColor: ink,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })

      new Marker({
        position: { lat: destLat, lng: destLng },
        map,
        title: t('destination'),
        icon: {
          path: SymbolPath.CIRCLE,
          scale: 7,
          fillColor: sky,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })

      // Draw the actual road route when we have its geometry, and frame the map
      // to it. Without a polyline the two endpoint markers convey the corridor.
      if (pathPolyline) {
        const path = encoding.decodePath(pathPolyline)
        new Polyline({
          path,
          map,
          strokeColor: sky,
          strokeOpacity: 0.9,
          strokeWeight: 4,
        })
        const bounds = new LatLngBounds()
        path.forEach((point) => bounds.extend(point))
        map.fitBounds(bounds, 28)
      }
    }).catch(() => {
      if (!cancelled) setMapState('error')
    })

    return () => {
      cancelled = true
      clearTimeout(timer)
      window.gm_authFailure = prevAuthFailure
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originLat, originLng, destLat, destLng, pathPolyline])

  const mapsUrl = `https://www.google.com/maps/dir/${originLat},${originLng}/${destLat},${destLng}`

  return (
    <figure className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="relative h-52">
        {/* Map div is always mounted so the SDK can render into it. Kept
            invisible until tilesloaded confirms auth succeeded, so Google's
            error overlay is never visible. */}
        <div
          ref={mapRef}
          role="img"
          aria-label={t('label', { route: routeName })}
          className="absolute inset-0"
          style={{ visibility: mapState === 'ready' ? 'visible' : 'hidden' }}
        />
        {mapState !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-body-s text-ink-muted">
            {mapState === 'loading' ? t('loading') : t('unavailable')}
          </div>
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-3 border-t border-border px-4">
        <span className="py-3 text-caption text-ink-muted">{t('live')}</span>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-touch items-center text-body-s font-bold text-sky hover:text-sky-deep"
        >
          {t('open')} ↗
        </a>
      </figcaption>
    </figure>
  )
}
