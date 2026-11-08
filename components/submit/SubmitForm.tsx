'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { submitProgram } from '@/lib/actions/submit'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/sereno/Button'
import { Alert } from '@/components/sereno/Alert'
import { DisplayTitle, emphasis } from '@/components/sereno/Typography'
import { Field, inputCls } from '@/components/auth/fields'

const TRIGGER_TYPES = ['weather', 'urban', 'event', 'manual'] as const

export default function SubmitForm({ categories }: { categories: Category[] }) {
  const t = useTranslations('submit')
  const tc = useTranslations('common')
  const tRoot = useTranslations()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [triggerType, setTriggerType] = useState<string>('weather')
  const [triggerDescription, setTriggerDescription] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('México')
  const [eventDate, setEventDate] = useState('')
  const [proposedPayout, setProposedPayout] = useState('')

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 7)
  const minDateStr = minDate.toISOString().split('T')[0]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await submitProgram({
          title,
          description,
          category_id: categoryId,
          trigger_type: triggerType,
          trigger_description: triggerDescription,
          location_city: city,
          location_country: country,
          event_date: eventDate,
          proposed_payout: proposedPayout,
        })
        setSubmitted(true)
      } catch {
        setError(tc('genericError'))
      }
    })
  }

  if (submitted) {
    return (
      <div role="status" className="space-y-4">
        <DisplayTitle as="h2" size="m">{t.rich('thanksTitle', emphasis)}</DisplayTitle>
        <p className="text-body text-ink-secondary">
          {t.rich('received', { name: title, strong: (c) => <strong className="text-ink">{c}</strong> })} {t('thanksBody')}
        </p>
        <Button variant="secondary" onClick={() => { setSubmitted(false); setTitle(''); setDescription(''); setTriggerDescription('') }}>
          {t('another')}
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Alert tone="danger">{error}</Alert>}

      <Field id="sub-title" label={t('name')}>
        <input id="sub-title" className={inputCls} placeholder={t('namePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </Field>

      <Field id="sub-desc" label={t('description')}>
        <textarea id="sub-desc" className={cn(inputCls, 'h-auto py-3')} rows={3} placeholder={t('descriptionPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={2000} />
      </Field>

      {categories.length > 0 && (
        <Field id="sub-cat" label={t('category')}>
          <select id="sub-cat" className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{tRoot.has(`categories.${c.slug}`) ? tRoot(`categories.${c.slug}`) : c.name}</option>
            ))}
          </select>
        </Field>
      )}

      <fieldset>
        <legend className="mb-2 text-label text-ink">{t('triggerType')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRIGGER_TYPES.map((type) => (
            <label
              key={type}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-m border p-3.5',
                triggerType === type ? 'border-2 border-sky bg-surface-raised' : 'border-border-strong bg-surface',
              )}
            >
              <input type="radio" name="trigger_type" value={type} checked={triggerType === type} onChange={() => setTriggerType(type)} className="mt-1 h-4 w-4 accent-sky" />
              <span>
                <span className="block text-body-s font-bold text-ink">{t(`types.${type}.label`)}</span>
                <span className="block text-caption text-ink-muted">{t(`types.${type}.example`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="sub-trigger" label={t('trigger')} hint={t('triggerHint')}>
        <textarea id="sub-trigger" className={cn(inputCls, 'h-auto py-3')} rows={2} placeholder={t('triggerPlaceholder')} value={triggerDescription} onChange={(e) => setTriggerDescription(e.target.value)} required maxLength={1000} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="sub-city" label={t('location')}>
          <input id="sub-city" className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} required maxLength={100} />
        </Field>
        <Field id="sub-country" label={t('country')}>
          <input id="sub-country" className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} required maxLength={100} />
        </Field>
        <Field id="sub-date" label={t('date')}>
          <input id="sub-date" type="date" className={inputCls} min={minDateStr} value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
        </Field>
      </div>

      <Field id="sub-payout" label={t('payout')} hint={t('payoutHint')}>
        <input id="sub-payout" type="number" min="50" step="50" className={inputCls} value={proposedPayout} onChange={(e) => setProposedPayout(e.target.value)} />
      </Field>

      <Button type="submit" size="main" block disabled={isPending}>
        {isPending ? t('sending') : t('submit')}
      </Button>
    </form>
  )
}
