'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createProviderPaymentIntent, activatePositionByPaymentIntent } from '@/lib/actions/purchase'
import { contractEyebrow, contractName } from '@/lib/contracts/display'
import { formatMoney, cn } from '@/lib/utils'
import type { ContractWithTiers } from '@/lib/types'
import type { Locale } from '@/i18n/config'
import { Eyebrow, DisplayTitle, emphasis } from '@/components/sereno/Typography'
import { TierChoice } from '@/components/sereno/Choice'
import { Button, ButtonLink } from '@/components/sereno/Button'
import { Alert } from '@/components/sereno/Alert'
import { InsuMark } from '@/components/sereno/Logo'
import StripePaymentForm from '@/components/markets/StripePaymentForm'

const CHIPS = [100, 500, 1000]

/**
 * Aportar capital (handoff §6.10): amount, what the pool still needs, both
 * outcomes, a required risk checkbox, then the card — all on one page.
 */
export default function DepositFlow({ contract, userId }: { contract: ContractWithTiers; userId: string | null }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const router = useRouter()
  const tiers = [...contract.coverage_tiers].sort((a, b) => (a.name === 'basic' ? -1 : b.name === 'basic' ? 1 : 0))
  const roomOf = (id: string) => {
    const x = tiers.find((y) => y.id === id)
    return x ? Math.max(0, Number(x.max_capacity_usd) - Number(x.current_capacity_usd)) : 0
  }
  const [tierId, setTierId] = useState<string | null>(tiers.find((x) => roomOf(x.id) > 0)?.id ?? null)
  const [amount, setAmount] = useState('500')
  const [custom, setCustom] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const value = Number(amount)
  const room = tierId ? roomOf(tierId) : 0
  const valid = Number.isFinite(value) && value >= 10 && value <= room
  const label = formatMoney(Number.isFinite(value) ? value : 0, 'USD')
  const name = contractName(contract, locale, t)

  async function start() {
    if (!tierId || !valid) return
    if (!userId) {
      router.push(`/auth/signup?next=${encodeURIComponent(`/earn/${contract.slug}`)}`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await createProviderPaymentIntent(tierId, value)
      if ('error' in result) {
        setError(
          result.code === 'maxDeposit'
            ? t('errors.maxDeposit', { amount: formatMoney(room, 'USD') })
            : t.has(`errors.${result.code}`) ? t(`errors.${result.code}`) : t('errors.payment'),
        )
        return
      }
      setClientSecret(result.clientSecret)
    } catch {
      setError(t('common.genericError'))
    } finally {
      setLoading(false)
    }
  }

  async function onPaid() {
    if (!clientSecret) return
    const result = await activatePositionByPaymentIntent(clientSecret)
    if ('error' in result) {
      setError(t('payment.activationError'))
      return
    }
    setDone(true)
    window.scrollTo({ top: 0 })
  }

  if (done) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-5 pb-12 pt-8">
        <InsuMark confirmed className="h-12" />
        <Eyebrow className="mt-6">{t('confirm.eyebrowCapital')}</Eyebrow>
        <DisplayTitle size="l" className="mt-2">{t.rich('confirm.titleCapital', emphasis)}</DisplayTitle>
        <section className="mt-6 rounded-xl border border-border bg-surface p-5">
          <p className="text-body-s text-ink-muted">{name}</p>
          <p className="text-eyebrow mt-3 uppercase text-ink-muted">{t('confirm.contributed')}</p>
          <p className="font-display text-amount text-ink">{label}</p>
          <p className="mt-2 text-caption text-ink-muted">{t('common.chargedInUsd')}</p>
        </section>
        <ButtonLink href="/earn" variant="ink" size="main" block className="mt-8">
          {t('confirm.goEarn')}
        </ButtonLink>
      </main>
    )
  }

  const locked = clientSecret != null

  return (
    <main className="mx-auto w-full max-w-[560px] space-y-6 px-5 pb-12 pt-6">
      <div>
        <Eyebrow>{t('deposit.eyebrow')} · {contractEyebrow(contract, t)}</Eyebrow>
        <p className="mt-1 text-title text-ink">{name}</p>
        <DisplayTitle size="m" className="mt-3">{t.rich('deposit.title', emphasis)}</DisplayTitle>
      </div>

      {tiers.length > 1 && (
        <TierChoice
          name="pool"
          legend={t('deposit.tierLabel')}
          value={tierId}
          onChange={(id) => !locked && setTierId(id)}
          options={tiers.map((x) => ({
            id: x.id,
            title: x.max_payouts > 1 ? t('tiers.pro', { count: x.max_payouts }) : t('tiers.basic'),
            explain: roomOf(x.id) > 0 ? t('deposit.poolNeeds', { amount: formatMoney(roomOf(x.id), 'USD') }) : t('deposit.poolFull'),
            price: formatMoney(Number(x.payout_usd), 'USD'),
            disabled: roomOf(x.id) <= 0,
          }))}
        />
      )}

      <div>
        <label htmlFor="deposit-amount" className="block text-label text-ink">{t('deposit.amountLabel')}</label>
        <div className="mt-2 flex items-baseline gap-1 rounded-m border border-border-strong bg-surface px-4 focus-within:border-sky">
          <span aria-hidden className="font-display text-amount text-ink-muted">$</span>
          <input
            id="deposit-amount"
            inputMode="decimal"
            value={amount}
            disabled={locked}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            aria-describedby="deposit-room"
            className="h-16 w-full min-w-0 bg-transparent font-display text-amount text-ink outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={locked}
              aria-pressed={!custom && value === c}
              onClick={() => {
                setCustom(false)
                setAmount(String(c))
              }}
              className={cn(
                'min-h-touch rounded-full border px-4 text-body-s font-bold',
                !custom && value === c ? 'border-2 border-sky bg-surface-raised text-ink' : 'border-border-strong bg-surface text-ink-secondary',
              )}
            >
              {formatMoney(c, 'USD')}
            </button>
          ))}
          <button
            type="button"
            disabled={locked}
            aria-pressed={custom}
            onClick={() => {
              setCustom(true)
              setAmount('')
              document.getElementById('deposit-amount')?.focus()
            }}
            className={cn(
              'min-h-touch rounded-full border px-4 text-body-s font-bold',
              custom ? 'border-2 border-sky bg-surface-raised text-ink' : 'border-border-strong bg-surface text-ink-secondary',
            )}
          >
            {t('deposit.other')}
          </button>
        </div>
        <p id="deposit-room" className="mt-2 text-caption text-ink-muted">
          {room > 0 ? t('deposit.poolNeeds', { amount: formatMoney(room, 'USD') }) : t('deposit.poolFull')}
          {amount && value < 10 && ` ${t('deposit.min')}`}
          {value > room && room > 0 && ` ${t('deposit.max', { amount: formatMoney(room, 'USD') })}`}
        </p>
      </div>

      <section aria-labelledby="outcomes" className="rounded-xl border border-border bg-surface p-5">
        <h2 id="outcomes" className="text-label text-ink">{t('deposit.outcomeTitle')}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-eyebrow uppercase text-ink-muted">{t('deposit.ifNot')}</dt>
            <dd className="mt-1 text-body-s text-pay-ink">{t('deposit.ifNotBody', { amount: label })}</dd>
          </div>
          <div>
            <dt className="text-eyebrow uppercase text-ink-muted">{t('deposit.ifYes')}</dt>
            <dd className="mt-1 font-display text-amount text-danger">{t('deposit.ifYesBody', { amount: label })}</dd>
          </div>
        </dl>
        <p className="mt-3 text-caption text-ink-muted">{t('common.chargedInUsd')}</p>
      </section>

      <label className="flex min-h-touch cursor-pointer items-start gap-3 text-body-s text-ink">
        <input
          type="checkbox"
          required
          checked={accepted}
          disabled={locked}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-sky"
        />
        <span>{t('deposit.risk')}</span>
      </label>

      {error && <Alert tone="danger">{error}</Alert>}

      {clientSecret ? (
        <StripePaymentForm clientSecret={clientSecret} amountLabel={label} onSuccess={onPaid} />
      ) : (
        <Button size="main" block disabled={!valid || !accepted || !tierId || loading} onClick={start}>
          {loading ? t('payment.preparing') : t('deposit.cta', { amount: label })}
        </Button>
      )}

      <p className="text-caption text-ink-muted">{t('earn.disclaimer')}</p>
    </main>
  )
}
