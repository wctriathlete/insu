import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LOCALE_COOKIE, isLocale } from '@/i18n/config'
import { safeNext } from '@/lib/auth/safeNext'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next')) ?? '/'
  let locale: string | null = null

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
    }
    // Restore the language chosen on another device when this one has none.
    if (data.user && !request.cookies.get(LOCALE_COOKIE)) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
      const saved = (profile as { preferred_locale?: string } | null)?.preferred_locale
      if (isLocale(saved)) locale = saved
    }
  }

  const response = NextResponse.redirect(`${origin}${next}`)
  if (locale) response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  return response
}
