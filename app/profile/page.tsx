import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import ProfileForm from '@/components/profile/ProfileForm'
import { DisplayTitle } from '@/components/sereno/Typography'
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/lib/types'
import { DEFAULT_THEME, THEME_COOKIE, isTheme } from '@/i18n/config'

export default async function ProfilePage() {
  const isConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!isConfigured) notFound()

  const t = await getTranslations('profile')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, preferred_currency, notification_prefs')
    .eq('id', user.id)
    .single()
  const p = (profile ?? {}) as {
    full_name: string | null
    role: string
    preferred_currency: 'USD' | 'LOCAL'
    notification_prefs: NotificationPrefs | null
  }
  const rawTheme = (await cookies()).get(THEME_COOKIE)?.value

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[560px] px-5 pb-10 pt-6">
        <DisplayTitle size="m" className="mb-6">{t('title')}</DisplayTitle>
        <ProfileForm
          email={user.email ?? ''}
          isAdmin={p.role === 'admin'}
          fullName={p.full_name ?? ''}
          preferredCurrency={p.preferred_currency === 'LOCAL' ? 'LOCAL' : 'USD'}
          theme={isTheme(rawTheme) ? rawTheme : DEFAULT_THEME}
          notificationPrefs={{ ...DEFAULT_NOTIFICATION_PREFS, ...(p.notification_prefs ?? {}) }}
        />
      </main>
    </>
  )
}
