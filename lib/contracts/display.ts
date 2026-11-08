/**
 * Contract naming for Sereno (handoff §7.2). Titles are assembled per locale
 * from structured parts instead of the free-text `contracts.title` column:
 *
 *   traffic   → route name (a place name, never translated) + window label
 *   air/flood/fuel → product name from messages, city as the eyebrow
 *   other (coming soon) → name_es / name_en columns
 *
 * Every part has a fallback derived from pre-Sereno columns, so rows written
 * before the migration (or by an older admin form) still render a clean name.
 * `contracts.title` stays as the internal/admin name and the last fallback.
 */
import type { CitySlug, ContractNameFields, Corridor } from '@/lib/types'
import type { Locale } from '@/i18n/config'

export type ProductKind = 'traffic' | 'air_quality' | 'flood' | 'fuel' | 'other'
export type CommuteWindow = 'morning' | 'evening'

/** Loose shape of a next-intl translator; avoids coupling this module to message typing. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Translate = (key: any, values?: any) => string

type CorridorNameFields = Pick<Corridor, 'name' | 'window_start' | 'window_end'> & {
  route_name?: string | null
}

type Nameable = Partial<Omit<ContractNameFields, 'trigger_type'>> & {
  trigger_type?: string
  corridor?: CorridorNameFields | null
}

export function productKind(c: { trigger_type?: string; corridor?: unknown }): ProductKind {
  switch (c.trigger_type) {
    case 'urban':
      return c.corridor ? 'traffic' : 'other'
    case 'air_quality':
    case 'flood':
    case 'fuel':
      return c.trigger_type
    default:
      return 'other'
  }
}

const CDMX_NAMES = new Set(['mexico city', 'cdmx', 'ciudad de méxico', 'ciudad de mexico'])

/** City slug from the column, else derived from location (only the two live markets map). */
export function citySlugOf(c: Pick<Nameable, 'city_slug' | 'location'>): CitySlug | null {
  if (c.city_slug === 'cdmx' || c.city_slug === 'guatemala_city') return c.city_slug
  const city = c.location?.city?.trim().toLowerCase() ?? ''
  const country = c.location?.country?.trim().toUpperCase() ?? ''
  if (country === 'MX' && CDMX_NAMES.has(city)) return 'cdmx'
  if (country === 'GT' && city.includes('guatemala')) return 'guatemala_city'
  return null
}

/** City label in the UI locale; non-market cities fall back to the stored place name. */
export function cityLabel(c: Pick<Nameable, 'city_slug' | 'location'>, t: Translate): string {
  const slug = citySlugOf(c)
  return slug ? t(`cities.${slug}`) : (c.location?.city ?? '')
}

/** "Periférico Sur → Centro" — strips the legacy " (Mañana)" / " (Tarde)" suffix. */
export function routeNameOf(corridor: Pick<CorridorNameFields, 'name' | 'route_name'>): string {
  if (corridor.route_name?.trim()) return corridor.route_name.trim()
  return corridor.name.replace(/\s*\((?:Mañana|Manana|Tarde|Morning|Evening)\)\s*$/i, '').trim()
}

export function commuteWindowOf(corridor: Pick<CorridorNameFields, 'window_start'>): CommuteWindow {
  return Number(corridor.window_start.split(':')[0]) < 12 ? 'morning' : 'evening'
}

/** 'HH:MM:SS' → 'HH:MM'. */
export function hhmm(time: string): string {
  return time.substring(0, 5)
}

/** "Mañanas 07:00–10:00" / "Evenings 17:00–20:00". */
export function windowLabel(corridor: Pick<CorridorNameFields, 'window_start' | 'window_end'>, t: Translate): string {
  return t(`windows.${commuteWindowOf(corridor)}`, {
    start: hhmm(corridor.window_start),
    end: hhmm(corridor.window_end),
  })
}

/** The contract's display name in `locale`. Names, never questions. */
export function contractName(c: Nameable, locale: Locale, t: Translate): string {
  const kind = productKind(c)
  if (kind === 'traffic' && c.corridor) return routeNameOf(c.corridor)
  if (kind !== 'other') return t(`products.${kind}.name`)
  const localized = locale === 'en' ? c.name_en : c.name_es
  return localized?.trim() || c.name_es?.trim() || c.name_en?.trim() || c.title || ''
}

/** "Tráfico · CDMX" — category line above titles (rendered uppercase by the eyebrow style). */
export function contractEyebrow(c: Nameable, t: Translate): string {
  const kind = productKind(c)
  const city = cityLabel(c, t)
  const category = t(`products.${kind}.category`)
  return city ? `${category} · ${city}` : category
}

/**
 * One-line name for lists that mix products (dashboard, notifications, Ganar):
 * "Periférico Sur → Centro · Mañanas 07:00–10:00", "Gasolina cara · Ciudad de Guatemala".
 */
export function contractFullName(c: Nameable, locale: Locale, t: Translate): string {
  const name = contractName(c, locale, t)
  const kind = productKind(c)
  if (kind === 'traffic' && c.corridor) return `${name} · ${windowLabel(c.corridor, t)}`
  if (kind === 'other') return name
  const city = cityLabel(c, t)
  return city ? `${name} · ${city}` : name
}

/** Localized description column, falling back to the legacy `description`. */
export function contractDescription(
  c: { description?: string | null; description_es?: string | null; description_en?: string | null },
  locale: Locale,
): string | null {
  const localized = locale === 'en' ? c.description_en : c.description_es
  return localized?.trim() || c.description?.trim() || null
}
