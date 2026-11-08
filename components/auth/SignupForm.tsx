'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/sereno/Button'
import { Alert } from '@/components/sereno/Alert'
import { DisplayTitle, emphasis } from '@/components/sereno/Typography'
import { Field, inputCls } from './fields'
import { authErrorMessage } from './LoginForm'

/**
 * Sign-up. Email confirmation is on in Supabase, so there's no session until
 * the link is opened: the link goes through /auth/callback?next=… and lands
 * the person back on the contract with their selection, ready to pay.
 */
export default function SignupForm({ next, continuing }: { next: string | null; continuing: boolean }) {
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accepted) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    if (!supabase) {
      setError(tc('genericError'))
      setLoading(false)
      return
    }
    const callback = new URL('/auth/callback', window.location.origin)
    if (next) callback.searchParams.set('next', next)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: callback.toString() },
    })
    if (error) {
      setError(authErrorMessage(error.message, t))
      setLoading(false)
      return
    }
    if (data.session) {
      // Auto-confirm environments: go straight on.
      router.push(next ?? '/')
      router.refresh()
      return
    }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div role="status" className="rounded-card bg-mist p-5">
        <DisplayTitle as="h2" size="s">{t.rich('checkEmailTitle', emphasis)}</DisplayTitle>
        <p className="mt-2 text-body text-sky-deep">{t('checkEmailBody', { email })}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="signup-name" label={t('name')}>
        <input id="signup-name" type="text" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
      </Field>
      <Field id="signup-email" label={t('email')}>
        <input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </Field>
      <Field id="signup-password" label={t('password')} hint={t('passwordHint')}>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          aria-describedby="signup-password-hint"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </Field>
      <label className="flex min-h-touch cursor-pointer items-start gap-3 text-body-s text-ink-secondary">
        <input
          type="checkbox"
          required
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-sky"
        />
        <span>
          {t.rich('terms', {
            link: (chunks) => (
              <Link href="/terms" target="_blank" className="font-bold text-sky underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" size="main" block disabled={loading || !accepted}>
        {loading ? t('creating') : continuing ? t('createAndContinue') : t('createCta')}
      </Button>
    </form>
  )
}
