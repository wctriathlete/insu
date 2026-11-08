'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/sereno/Button'
import { Alert } from '@/components/sereno/Alert'
import { Field, inputCls } from './fields'

export function authErrorMessage(message: string, t: ReturnType<typeof useTranslations>): string {
  if (/invalid login credentials/i.test(message)) return t('invalidCredentials')
  if (/email not confirmed/i.test(message)) return t('emailNotConfirmed')
  return message
}

export default function LoginForm({ next, initialError }: { next: string | null; initialError?: string | null }) {
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    if (!supabase) {
      setError(tc('genericError'))
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(authErrorMessage(error.message, t))
      setLoading(false)
      return
    }
    router.push(next ?? '/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
      <Field id="login-email" label={t('email')}>
        <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </Field>
      <Field id="login-password" label={t('password')}>
        <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
      </Field>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" size="main" block disabled={loading}>
        {loading ? t('loggingIn') : t('login')}
      </Button>
    </form>
  )
}
