'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/lib/actions/profile'
import { setLocale, setTheme } from '@/lib/actions/preferences'
import type { NotificationPrefs } from '@/lib/types'
import type { Locale, Theme } from '@/i18n/config'
import { SegmentedControl } from '@/components/sereno/SegmentedControl'
import { Button } from '@/components/sereno/Button'
import { Alert } from '@/components/sereno/Alert'
import LogoutButton from '@/components/layout/LogoutButton'
import { Field, inputCls } from '@/components/auth/fields'

interface Props {
  email: string
  isAdmin: boolean
  fullName: string
  preferredCurrency: 'USD' | 'LOCAL'
  theme: Theme
  notificationPrefs: NotificationPrefs
}

const section = 'rounded-card border border-border bg-surface p-5'

/**
 * Perfil (handoff §6.11). Language, currency and appearance apply the moment
 * they're chosen; name and notification preferences save together.
 */
export default function ProfileForm(props: Props) {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const locale = useLocale() as Locale
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [currency, setCurrency] = useState(props.preferredCurrency)
  const [theme, setThemeState] = useState<Theme>(props.theme)
  const [fullName, setFullName] = useState(props.fullName)
  const [prefs, setPrefs] = useState<NotificationPrefs>(props.notificationPrefs)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [password, setPassword] = useState('')
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function chooseLocale(next: Locale) {
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  function chooseCurrency(next: 'USD' | 'LOCAL') {
    setCurrency(next)
    startTransition(async () => {
      await updateProfile({ preferred_currency: next })
      router.refresh()
    })
  }

  function chooseTheme(next: Theme) {
    setThemeState(next)
    // Apply instantly; the cookie makes it stick on the next server render.
    document.documentElement.dataset.theme = next
    startTransition(async () => {
      await setTheme(next)
    })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await updateProfile({ full_name: fullName, notification_prefs: prefs })
    setMsg('error' in res ? { ok: false, text: tc('genericError') } : { ok: true, text: tc('saved') })
    setSaving(false)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    const supabase = createClient()
    if (!supabase) return
    const { error } = await supabase.auth.updateUser({ password })
    setPwMsg(error ? { ok: false, text: error.message } : { ok: true, text: t('passwordUpdated') })
    if (!error) setPassword('')
  }

  const initials = (props.fullName || props.email).trim().slice(0, 1).toUpperCase()

  return (
    <div className="space-y-4">
      <section className="flex items-center gap-4">
        <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-mist font-display text-[28px] text-sky-deep">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-title text-ink">{props.fullName || props.email}</p>
          <p className="truncate text-body-s text-ink-secondary">{props.email}</p>
        </div>
      </section>

      <section className={`${section} space-y-5`}>
        <div>
          <p id="lang-label" className="mb-2 text-label text-ink">{t('language')}</p>
          <SegmentedControl
            label={t('language')}
            value={locale}
            onChange={chooseLocale}
            options={[
              { value: 'es', label: tc('spanish') },
              { value: 'en', label: tc('english') },
            ]}
          />
        </div>
        <div>
          <p className="mb-2 text-label text-ink">{t('currency')}</p>
          <SegmentedControl
            label={t('currency')}
            value={currency}
            onChange={chooseCurrency}
            options={[
              { value: 'USD', label: t('currencyUsd') },
              { value: 'LOCAL', label: t('currencyLocal') },
            ]}
          />
          <p className="mt-1.5 text-caption text-ink-muted">{tc('alwaysChargedInUsd')}</p>
        </div>
        <div>
          <p className="mb-2 text-label text-ink">{t('appearance')}</p>
          <SegmentedControl
            label={t('appearance')}
            value={theme}
            onChange={chooseTheme}
            options={[
              { value: 'light', label: t('light') },
              { value: 'dark', label: t('dark') },
              { value: 'system', label: t('system') },
            ]}
          />
        </div>
      </section>

      <section className={section}>
        <h2 className="text-label text-ink">{t('card')}</h2>
        <p className="mt-1 text-body-s text-ink-secondary">{t('cardBody')}</p>
      </section>

      <form onSubmit={save} className={`${section} space-y-4`}>
        <Field id="full-name" label={t('name')}>
          <input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-label text-ink">{t('notifications')}</legend>
          <div className="space-y-1">
            {(Object.keys(prefs) as (keyof NotificationPrefs)[]).map((key) => (
              <label key={key} className="flex min-h-touch cursor-pointer items-center gap-3 text-body-s text-ink-secondary">
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                  className="h-5 w-5 shrink-0 accent-sky"
                />
                {t(`prefs.${key}`)}
              </label>
            ))}
          </div>
        </fieldset>
        {msg && <Alert tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Alert>}
        <Button type="submit" disabled={saving}>{saving ? tc('saving') : tc('save')}</Button>
      </form>

      <form onSubmit={savePassword} className={`${section} space-y-4`}>
        <Field id="new-password" label={t('newPassword')}>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </Field>
        {pwMsg && <Alert tone={pwMsg.ok ? 'success' : 'danger'}>{pwMsg.text}</Alert>}
        <Button type="submit" variant="secondary">{t('updatePassword')}</Button>
      </form>

      <nav className={`${section} divide-y divide-border py-1`}>
        {[
          { href: '/submit', label: t('propose') },
          { href: '/how-it-works', label: t('howAndTerms') },
          ...(props.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
        ].map((l) => (
          <Link key={l.href} href={l.href} className="flex min-h-[52px] items-center justify-between text-body font-bold text-ink hover:text-sky">
            {l.label}
            <ChevronRight size={18} aria-hidden className="text-ink-muted" />
          </Link>
        ))}
      </nav>

      <LogoutButton className="px-1" />
    </div>
  )
}
