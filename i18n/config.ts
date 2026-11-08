// Locale + theme preferences. Spanish is the default and is never auto-detected
// from the browser (handoff §7.1): English only when the person picks it.

export const LOCALES = ['es', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v)
}

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]
export const DEFAULT_THEME: Theme = 'light'
export const THEME_COOKIE = 'insu-theme'

export function isTheme(v: unknown): v is Theme {
  return typeof v === 'string' && (THEMES as readonly string[]).includes(v)
}

/** BCP-47 tag for Intl formatting in each UI locale. */
export const INTL_LOCALE: Record<Locale, string> = { es: 'es-MX', en: 'en-US' }
