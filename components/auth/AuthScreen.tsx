import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { contractFullName, productKind } from '@/lib/contracts/display'
import type { ContractNameFields, Corridor } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import Header from '@/components/layout/Header'
import { DisplayTitle, emphasis } from '@/components/sereno/Typography'
import { SegmentedControl } from '@/components/sereno/SegmentedControl'
import { ProductIcon } from '@/components/sereno/ProductIcon'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

interface Props {
  mode: 'signup' | 'login'
  next: string | null
  forSlug: string | null
  error?: string
}

/**
 * Full-screen sign up / log in (handoff §6.4). When reached from a contract,
 * shows a summary chip of what's being bought and returns straight to payment.
 */
export default async function AuthScreen({ mode, next, forSlug, error }: Props) {
  const t = await getTranslations()
  const locale = (await getLocale()) as Locale

  let chip: { name: string; kind: ReturnType<typeof productKind> } | null = null
  if (forSlug) {
    try {
      const supabase = await createClient()
      const { data } = await supabase.from('contracts').select('*, corridor:corridors(*)').eq('slug', forSlug).maybeSingle()
      if (data) {
        const c = data as unknown as ContractNameFields & { corridor: Corridor | null }
        chip = { name: contractFullName(c, locale, t), kind: productKind(c) }
      }
    } catch {
      // Chip is decoration; the form still works without it.
    }
  }

  const qs = new URLSearchParams()
  if (next) qs.set('next', next)
  if (forSlug) qs.set('for', forSlug)
  const suffix = qs.toString() ? `?${qs}` : ''

  return (
    <>
      <Header back={next ? { href: next.split('?')[0] } : { href: '/' }} hideSearch />
      <main className="mx-auto w-full max-w-[440px] px-5 pb-12 pt-8">
        <DisplayTitle size="m">
          {t.rich(chip ? 'auth.gateTitleRich' : mode === 'signup' ? 'auth.signupTitle' : 'auth.loginTitle', emphasis)}
        </DisplayTitle>
        <p className="mt-2 text-body text-ink-secondary">
          {chip ? t('auth.gateBody') : mode === 'signup' ? t('auth.signupBody') : t('auth.welcomeBody')}
        </p>

        {chip && (
          <div className="mt-5 flex items-center gap-3 rounded-card border border-border bg-surface p-3">
            <ProductIcon kind={chip.kind} />
            <div className="min-w-0">
              <p className="text-caption text-ink-muted">{t('auth.summary')}</p>
              <p className="text-body-s font-bold text-ink">{chip.name}</p>
            </div>
          </div>
        )}

        <SegmentedControl
          label={t('auth.tabs')}
          value={mode}
          className="mt-6"
          options={[
            { value: 'signup', label: t('auth.create'), href: `/auth/signup${suffix}` },
            { value: 'login', label: t('auth.haveAccount'), href: `/auth/login${suffix}` },
          ]}
        />

        <div className="mt-6">
          {mode === 'signup' ? (
            <SignupForm next={next} continuing={!!chip} />
          ) : (
            <LoginForm next={next} initialError={error === 'auth_callback_failed' ? t('auth.callbackFailed') : null} />
          )}
        </div>
      </main>
    </>
  )
}
