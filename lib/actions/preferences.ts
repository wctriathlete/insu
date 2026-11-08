'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { LOCALE_COOKIE, isLocale, type Locale } from '@/i18n/config'

const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * Persist the UI language in a cookie (read by i18n/request.ts on every
 * request) and, when signed in, on the profile so it follows the person to a
 * new device (restored at sign-in by app/auth/callback).
 */
export async function setLocale(locale: Locale): Promise<{ ok: true } | { error: string }> {
  if (!isLocale(locale)) return { error: 'Invalid locale' }
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' })

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any).update({ preferred_locale: locale }).eq('id', user.id)
    }
  } catch {
    // Cookie is the source of truth for rendering; the profile copy is best-effort.
  }
  return { ok: true }
}
