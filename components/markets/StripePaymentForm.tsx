'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { loadStripe, type StripeCardElementOptions } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/sereno/Button'
import { Alert } from '@/components/sereno/Alert'
import { cn } from '@/lib/utils'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const subscribeNoop = () => () => {}

/** Resolve Sereno tokens to concrete colors: Stripe's iframe can't read CSS variables. */
function useCardStyle(): StripeCardElementOptions {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false)
  return useMemo(() => {
    const read = (name: string, fallback: string) =>
      mounted ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback : fallback
    return {
      hidePostalCode: true,
      style: {
        base: {
          color: read('--ink', '#14213D'),
          fontFamily: 'Manrope, system-ui, sans-serif',
          fontSize: '16px',
          fontWeight: '500',
          '::placeholder': { color: read('--ink-muted', '#56627C') },
          iconColor: read('--sky', '#2F6FE4'),
        },
        invalid: { color: read('--danger', '#B42318'), iconColor: read('--danger', '#B42318') },
      },
    }
  }, [mounted])
}

interface FormProps {
  clientSecret: string
  /** Formatted amount for the button, e.g. "$5". */
  amountLabel: string
  onSuccess: () => void | Promise<void>
}

function CardPaymentForm({ clientSecret, amountLabel, onSuccess }: FormProps) {
  const t = useTranslations('payment')
  const stripe = useStripe()
  const elements = useElements()
  const options = useCardStyle()
  const [loading, setLoading] = useState(false)
  const [declined, setDeclined] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    const card = elements.getElement(CardElement)
    if (!card) return
    setLoading(true)
    setDeclined(null)
    try {
      const { error } = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } })
      if (error) {
        // The intent stays open after a decline, so the same form can retry.
        setDeclined(error.message ?? '')
      } else {
        // Hold the processing state through activation: re-enabling the form
        // here invites a double-submit against an already-succeeded intent.
        await onSuccess()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {declined !== null && (
        <Alert tone="danger">
          <p className="font-bold">{t('declined')}</p>
          {declined && <p className="mt-0.5">{declined}</p>}
        </Alert>
      )}
      <div>
        <label htmlFor="card-element" className="mb-1.5 block text-label text-ink">
          {t('card')}
        </label>
        <div
          id="card-element"
          className={cn(
            'rounded-m border bg-surface px-4 py-[15px]',
            declined !== null ? 'border-2 border-danger' : 'border-border-strong',
          )}
        >
          <CardElement options={options} onChange={() => declined !== null && setDeclined(null)} />
        </div>
      </div>
      <Button type="submit" size="main" block disabled={!stripe || loading}>
        {loading ? t('processing') : declined !== null ? t('tryAgainPay', { amount: amountLabel }) : t('pay', { amount: amountLabel })}
      </Button>
    </form>
  )
}

export default function StripePaymentForm(props: FormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Manrope:wght@500;700&display=swap' }] }}
    >
      <CardPaymentForm {...props} />
    </Elements>
  )
}
