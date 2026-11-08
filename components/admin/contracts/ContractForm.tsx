'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertContract, cancelContract } from '@/lib/actions/admin'
import { cn } from '@/lib/utils'
import type { Category, ContractWithTiers, LaunchStage, UpsertContractInput } from '@/lib/types'

const WEATHER_METRICS = ['rainfall', 'temperature', 'wind', 'snow']
const URBAN_METRICS = ['delay', 'congestion']
const FUEL_TYPES = ['magna', 'premium', 'diesel'] as const
const COMPARATORS = ['>', '>=', '<', '<='] as const
const SYMBOL_TO_OPERATOR: Record<string, 'gt' | 'gte' | 'lt' | 'lte'> = {
  '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte',
}
const OPERATOR_TO_SYMBOL: Record<string, string> = {
  gt: '>', gte: '>=', lt: '<', lte: '<=',
}

export function buildTriggerCondition(
  type: string,
  state: { metric: string; comparator: string; threshold: string; unit: string; description: string; fuel_type: string },
): Record<string, unknown> {
  if (type === 'air_quality') {
    return { metric: 'aqi_imeca', operator: 'gte', threshold: Number(state.threshold) }
  }
  if (type === 'flood') {
    return { metric: 'rain_1h_mm', operator: 'gte', threshold: Number(state.threshold) }
  }
  if (type === 'weather' || type === 'urban') {
    return {
      metric: state.metric,
      operator: SYMBOL_TO_OPERATOR[state.comparator] ?? 'gt',
      threshold: Number(state.threshold),
      unit: state.unit,
    }
  }
  if (type === 'fuel') {
    return {
      metric: 'price_mxn_per_liter',
      operator: SYMBOL_TO_OPERATOR[state.comparator] ?? 'gt',
      threshold: Number(state.threshold),
      fuel_type: state.fuel_type,
      region: 'cdmx',
    }
  }
  if (type === 'event') return { description: state.description }
  return {}
}

function parseTriggerCondition(
  type: string,
  condition: Record<string, unknown>,
) {
  if (type === 'air_quality' || type === 'flood') {
    return { metric: '', comparator: '>', threshold: String(condition.threshold ?? ''), unit: '', description: '', fuel_type: '' }
  }
  if (type === 'weather' || type === 'urban') {
    const operator = String(condition.operator ?? condition.comparator ?? 'gt')
    const comparator = OPERATOR_TO_SYMBOL[operator] ?? operator
    return {
      metric: String(condition.metric ?? ''),
      comparator,
      threshold: String(condition.threshold ?? ''),
      unit: String(condition.unit ?? ''),
      description: '',
      fuel_type: '',
    }
  }
  if (type === 'fuel') {
    const operator = String(condition.operator ?? 'gt')
    return {
      metric: 'price_mxn_per_liter',
      comparator: OPERATOR_TO_SYMBOL[operator] ?? '>',
      threshold: String(condition.threshold ?? ''),
      unit: '',
      description: '',
      fuel_type: String(condition.fuel_type ?? 'magna'),
    }
  }
  if (type === 'event') {
    return { metric: '', comparator: '>', threshold: '', unit: '', description: String(condition.description ?? ''), fuel_type: '' }
  }
  return { metric: '', comparator: '>', threshold: '', unit: '', description: '', fuel_type: '' }
}

interface Props {
  categories: Category[]
  contract?: ContractWithTiers
}

export function ContractForm({ categories, contract }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(contract?.title ?? '')
  // Sereno naming (handoff §7.2): public names are assembled per locale. Traffic,
  // air, rain and gas get theirs from the app's messages; these fields name
  // anything else (coming-soon products) and hold per-locale descriptions.
  const [citySlug, setCitySlug] = useState<string>(contract?.city_slug ?? '')
  const [nameEs, setNameEs] = useState(contract?.name_es ?? '')
  const [nameEn, setNameEn] = useState(contract?.name_en ?? '')
  const [descriptionEs, setDescriptionEs] = useState(contract?.description_es ?? '')
  const [descriptionEn, setDescriptionEn] = useState(contract?.description_en ?? '')
  const [description, setDescription] = useState(contract?.description ?? '')
  const [categoryId, setCategoryId] = useState(contract?.category_id ?? categories[0]?.id ?? '')
  const [status, setStatus] = useState<string>(contract?.status ?? 'pending')
  const [triggerType, setTriggerType] = useState<string>(contract?.trigger_type ?? 'weather')
  const [deadline, setDeadline] = useState(
    contract?.trigger_deadline
      ? new Date(contract.trigger_deadline).toISOString().split('T')[0]
      : '',
  )
  const [locationCity, setLocationCity] = useState(contract?.location?.city ?? '')
  const [locationCountry, setLocationCountry] = useState(contract?.location?.country ?? '')
  const [locationLat, setLocationLat] = useState(String(contract?.location?.lat ?? ''))
  const [locationLng, setLocationLng] = useState(String(contract?.location?.lng ?? ''))
  const [iconUrl, setIconUrl] = useState(contract?.icon_url ?? '')
  const [isFeatured, setIsFeatured] = useState(contract?.is_featured ?? false)
  const [launchStage, setLaunchStage] = useState<LaunchStage>(contract?.launch_stage ?? 'live')
  const [isRecurring, setIsRecurring] = useState(contract?.is_recurring ?? false)

  // Corridor (urban) route endpoints live on the linked corridor row.
  const corridor = contract?.corridor ?? null
  const [originLat, setOriginLat] = useState(String(corridor?.origin_lat ?? ''))
  const [originLng, setOriginLng] = useState(String(corridor?.origin_lng ?? ''))
  const [destLat, setDestLat] = useState(String(corridor?.dest_lat ?? ''))
  const [destLng, setDestLng] = useState(String(corridor?.dest_lng ?? ''))

  const [condState, setCondState] = useState(() =>
    parseTriggerCondition(contract?.trigger_type ?? 'weather', (contract?.trigger_condition as Record<string, unknown>) ?? {}),
  )

  const basicTier = contract?.coverage_tiers?.find((t) => t.name === 'basic')
  const premiumTier = contract?.coverage_tiers?.find((t) => t.name === 'premium')
  const [basicPremium, setBasicPremium] = useState(String(basicTier?.premium_usd ?? ''))
  const [basicPayout, setBasicPayout] = useState(String(basicTier?.payout_usd ?? ''))
  const [basicCapacity, setBasicCapacity] = useState(String(basicTier?.max_capacity_usd ?? ''))
  const [premPremium, setPremPremium] = useState(String(premiumTier?.premium_usd ?? ''))
  const [premPayout, setPremPayout] = useState(String(premiumTier?.payout_usd ?? ''))
  const [premCapacity, setPremCapacity] = useState(String(premiumTier?.max_capacity_usd ?? ''))

  function handleTypeChange(newType: string) {
    setTriggerType(newType)
    setCondState({ metric: '', comparator: '>', threshold: '', unit: '', description: '', fuel_type: newType === 'fuel' ? 'magna' : '' })
  }

  // Validate on the client so the admin sees the real reason. Server-thrown
  // errors are redacted to an opaque digest in production builds, so a bare
  // throw in upsertContract() surfaces here as an unhelpful generic message.
  function validate(): string | null {
    if (triggerType === 'air_quality' || triggerType === 'flood') {
      const t = condState.threshold.trim()
      if (t === '' || Number.isNaN(Number(t)) || Number(t) <= 0) {
        return 'Threshold must be a positive number'
      }
    }
    const tierFields: Array<[string, string]> = [
      ['Basic premium', basicPremium], ['Basic payout', basicPayout], ['Basic max capacity', basicCapacity],
      ['Pro premium', premPremium], ['Pro payout', premPayout], ['Pro max capacity', premCapacity],
    ]
    for (const [label, raw] of tierFields) {
      if (raw.trim() === '' || Number.isNaN(Number(raw))) return `${label} must be a number`
    }
    if (Number(basicPayout) <= Number(basicPremium)) return 'Basic payout must exceed its premium'
    if (Number(premPayout) <= Number(premPremium)) return 'Pro payout must exceed its premium'
    if (!isRecurring) {
      if (!deadline) return 'Set a deadline, or mark the contract recurring'
      if (new Date(deadline).getTime() <= Date.now()) return 'Deadline must be in the future'
    }
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    // Only send naming columns that are set (or already exist on the row), so the
    // form keeps working against a database without the Sereno migration.
    function buildNaming(): UpsertContractInput['naming'] {
      const fields = {
        city_slug: citySlug || null,
        name_es: nameEs.trim() || null,
        name_en: nameEn.trim() || null,
        description_es: descriptionEs.trim() || null,
        description_en: descriptionEn.trim() || null,
      }
      const out: Record<string, string | null> = {}
      for (const [k, v] of Object.entries(fields)) {
        if (v !== null || (contract && k in contract)) out[k] = v
      }
      return Object.keys(out).length > 0 ? (out as UpsertContractInput['naming']) : undefined
    }

    const input: UpsertContractInput = {
      ...(contract?.id ? { id: contract.id } : {}),
      title,
      description: description || null,
      category_id: categoryId,
      status: status as UpsertContractInput['status'],
      trigger_type: triggerType as UpsertContractInput['trigger_type'],
      trigger_condition: buildTriggerCondition(triggerType, condState),
      trigger_deadline: isRecurring ? null : new Date(deadline).toISOString(),
      is_recurring: isRecurring,
      location: {
        city: locationCity, country: locationCountry,
        lat: Number(locationLat), lng: Number(locationLng),
      },
      icon_url: iconUrl || null,
      is_featured: isFeatured,
      launch_stage: launchStage,
      naming: buildNaming(),
      basic_tier: { premium_usd: Number(basicPremium), payout_usd: Number(basicPayout), max_capacity_usd: Number(basicCapacity) },
      premium_tier: { premium_usd: Number(premPremium), payout_usd: Number(premPayout), max_capacity_usd: Number(premCapacity) },
      ...(corridor ? {
        corridor: {
          id: corridor.id,
          origin_lat: Number(originLat), origin_lng: Number(originLng),
          dest_lat: Number(destLat), dest_lng: Number(destLng),
        },
      } : {}),
    }

    startTransition(async () => {
      try {
        await upsertContract(input)
        router.push('/admin/contracts')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  function handleCancelMarket() {
    if (!contract?.id) return
    if (!window.confirm(
      'Cancel this market? It will be removed from Browse and hidden from everyone’s dashboard. '
      + 'Existing positions are NOT refunded. This cannot be undone from here.',
    )) return

    setError(null)
    startTransition(async () => {
      try {
        await cancelContract(contract.id)
        router.push('/admin/contracts')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cancel failed')
      }
    })
  }

  const canCancelMarket = !!contract?.id && contract.status !== 'settled' && contract.status !== 'cancelled'

  const inputCls = 'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-sky focus:outline-none'
  const labelCls = 'mb-1 block text-[12px] uppercase tracking-wider text-ink-muted'
  const selectCls = inputCls + ' cursor-pointer'

  const isUserSubmission = contract?.status === 'pending'
    && !!(contract?.trigger_condition as Record<string, unknown>)?._user_submission

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <h1 className="font-display text-2xl tracking-wide text-ink">
        {contract ? (isUserSubmission ? 'Review Submission' : 'Edit Contract') : 'New Contract'}
      </h1>

      {isUserSubmission && (
        <div className="rounded-md border border-sky bg-surface-raised px-4 py-3 text-sm">
          <p className="mb-1 font-semibold text-sky">User submission</p>
          <p className="text-ink-secondary">
            This contract was submitted by a user. Review the pitch below, fill in the trigger condition and coverage tiers, then set status to <strong className="text-ink">active</strong> to publish it.
          </p>
          {!!(contract?.trigger_condition as Record<string, unknown>)?.description && (
            <p className="mt-2 rounded bg-panel/60 px-3 py-2 tabular-nums text-[13px] text-ink-muted">
              Pitch: &quot;{String((contract.trigger_condition as Record<string, unknown>).description)}&quot;
            </p>
          )}
          {!!(contract?.trigger_condition as Record<string, unknown>)?.proposed_payout && (
            <p className="mt-1 tabular-nums text-[13px] text-ink-muted">
              Proposed payout: ${String((contract.trigger_condition as Record<string, unknown>).proposed_payout)}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-md border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div>
        <label className={labelCls} htmlFor="cf-title">Internal name</label>
        <input id="cf-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
        <p className="mt-1 text-[12px] text-ink-muted">
          Admin, Stripe and audit logs only. The app shows names built per language (below).
        </p>
      </div>

      <fieldset className="space-y-3 rounded-md border border-border p-4">
        <legend className="px-1 text-[12px] uppercase tracking-wider text-ink-muted">Public name (per language)</legend>
        <p className="text-[12px] text-ink-muted">
          Traffic routes use the corridor&apos;s route name; air, rain and gas use the app&apos;s product names.
          Fill these for anything else (e.g. coming-soon products). Names, never questions.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="cf-name-es">Name (es)</label>
            <input id="cf-name-es" className={inputCls} value={nameEs} onChange={(e) => setNameEs(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cf-name-en">Name (en)</label>
            <input id="cf-name-en" className={inputCls} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cf-desc-es">Description (es)</label>
            <textarea id="cf-desc-es" className={inputCls} rows={2} value={descriptionEs} onChange={(e) => setDescriptionEs(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cf-desc-en">Description (en)</label>
            <textarea id="cf-desc-en" className={inputCls} rows={2} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cf-city">City</label>
            <select id="cf-city" className={inputCls} value={citySlug} onChange={(e) => setCitySlug(e.target.value)}>
              <option value="">Other (use location city)</option>
              <option value="cdmx">CDMX</option>
              <option value="guatemala_city">Ciudad de Guatemala</option>
            </select>
          </div>
        </div>
      </fieldset>

      <div>
        <label className={labelCls} htmlFor="cf-desc">Legacy description</label>
        <textarea id="cf-desc" className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Category</label>
          <select className={selectCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {['active', 'pending', 'settled', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Trigger type</label>
          <select className={selectCls} value={triggerType} onChange={(e) => handleTypeChange(e.target.value)}>
            {['weather', 'urban', 'fuel', 'event', 'manual'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="air_quality">Air quality (IMECA)</option>
            <option value="flood">Flood (rainfall)</option>
          </select>
        </div>
        {!isRecurring && (
          <div>
            <label className={labelCls}>Deadline</label>
            <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          </div>
        )}
      </div>

      {/* Trigger condition block */}
      <div className="rounded-lg border border-sky bg-surface-raised p-4">
        <p className="mb-3 text-[12px] uppercase tracking-wider text-sky">
          Trigger Condition — {triggerType}
        </p>

        {(triggerType === 'weather' || triggerType === 'urban') && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Metric</label>
              <select className={selectCls} value={condState.metric} onChange={(e) => setCondState((s) => ({ ...s, metric: e.target.value }))}>
                {(triggerType === 'weather' ? WEATHER_METRICS : URBAN_METRICS).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Comparator</label>
              <select className={selectCls} value={condState.comparator} onChange={(e) => setCondState((s) => ({ ...s, comparator: e.target.value }))}>
                {COMPARATORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Threshold</label>
              <input className={inputCls} placeholder="e.g. 25" value={condState.threshold} onChange={(e) => setCondState((s) => ({ ...s, threshold: e.target.value }))} />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>Unit</label>
              <input className={inputCls} placeholder="e.g. mm/hr, min" value={condState.unit} onChange={(e) => setCondState((s) => ({ ...s, unit: e.target.value }))} />
            </div>
          </div>
        )}

        {triggerType === 'fuel' && (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Fuel Type</label>
              <select
                className={selectCls}
                value={condState.fuel_type}
                onChange={(e) => setCondState((s) => ({ ...s, fuel_type: e.target.value }))}
              >
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Comparator</label>
              <select
                className={selectCls}
                value={condState.comparator}
                onChange={(e) => setCondState((s) => ({ ...s, comparator: e.target.value }))}
              >
                {['>', '>=', '<', '<='].map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Threshold (MXN/liter)</label>
              <input
                className={inputCls}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 26.50"
                value={condState.threshold}
                onChange={(e) => setCondState((s) => ({ ...s, threshold: e.target.value }))}
              />
            </div>
            <p className="text-xs text-ink-secondary">Region: CDMX (fixed)</p>
          </div>
        )}

        {triggerType === 'event' && (
          <div>
            <label className={labelCls}>Condition description</label>
            <input className={inputCls} placeholder="e.g. Stadium capacity exceeds 90%" value={condState.description} onChange={(e) => setCondState((s) => ({ ...s, description: e.target.value }))} />
          </div>
        )}

        {triggerType === 'manual' && (
          <p className="text-sm text-ink-muted">No oracle condition — settlement is triggered manually via the Trigger Override section.</p>
        )}

        {(triggerType === 'air_quality' || triggerType === 'flood') && (
          <div>
            <label className={labelCls}>Threshold</label>
            <input
              aria-label="Trigger threshold"
              className={inputCls}
              type="number"
              min="0.001"
              placeholder={triggerType === 'air_quality' ? 'e.g. 150 (IMECA)' : 'e.g. 30 (mm)'}
              value={condState.threshold}
              required
              onChange={(e) => setCondState((s) => ({ ...s, threshold: e.target.value }))}
            />
            <p className="mt-1 text-xs text-ink-secondary">
              {triggerType === 'air_quality' ? 'Metric: aqi_imeca ≥ threshold (fixed)' : 'Metric: rain_1h_mm ≥ threshold (fixed)'}
            </p>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} value={locationCity} onChange={(e) => setLocationCity(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Country</label>
          <input className={inputCls} value={locationCountry} onChange={(e) => setLocationCountry(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Latitude</label>
          <input className={inputCls} type="number" step="any" value={locationLat} onChange={(e) => setLocationLat(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Longitude</label>
          <input className={inputCls} type="number" step="any" value={locationLng} onChange={(e) => setLocationLng(e.target.value)} required />
        </div>
      </div>

      {/* Corridor route endpoints (urban contracts only) */}
      {corridor && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-1 text-[12px] uppercase tracking-wider text-ink-muted">Corridor route</p>
          <p className="mb-3 text-[11px] text-ink-secondary">
            Origin &amp; destination define the route drawn on the map and measured for traffic.
            Tip: right-click a point in Google Maps to copy its lat, lng. Saving re-fetches the road path.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Origin latitude</label>
              <input className={inputCls} type="number" step="any" value={originLat} onChange={(e) => setOriginLat(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Origin longitude</label>
              <input className={inputCls} type="number" step="any" value={originLng} onChange={(e) => setOriginLng(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Destination latitude</label>
              <input className={inputCls} type="number" step="any" value={destLat} onChange={(e) => setDestLat(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Destination longitude</label>
              <input className={inputCls} type="number" step="any" value={destLng} onChange={(e) => setDestLng(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Icon URL */}
      <div>
        <label className={labelCls}>Icon URL (optional)</label>
        <input className={inputCls} value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://..." />
      </div>

      {/* Coverage tiers */}
      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-[12px] uppercase tracking-wider text-ink-muted">Coverage Tiers (USD)</p>
        <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-3 mb-2">
          <div />
          <span className="text-[12px] uppercase tracking-wider text-ink-muted">Premium</span>
          <span className="text-[12px] uppercase tracking-wider text-ink-muted">Payout</span>
          <span className="text-[12px] uppercase tracking-wider text-ink-muted">Max Capacity</span>
        </div>
        <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-3 mb-2 items-center">
          <span className="text-sm text-ink-secondary">Basic</span>
          <input aria-label="Basic premium" className={inputCls} type="number" min="0" step="0.01" value={basicPremium} onChange={(e) => setBasicPremium(e.target.value)} required />
          <input aria-label="Basic payout" className={inputCls} type="number" min="0" step="0.01" value={basicPayout} onChange={(e) => setBasicPayout(e.target.value)} required />
          <input aria-label="Basic max capacity" className={inputCls} type="number" min="0" value={basicCapacity} onChange={(e) => setBasicCapacity(e.target.value)} required />
        </div>
        <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-3 items-center">
          <span className="text-sm text-ink-secondary">Premium</span>
          <input aria-label="Pro premium" className={inputCls} type="number" min="0" step="0.01" value={premPremium} onChange={(e) => setPremPremium(e.target.value)} required />
          <input aria-label="Pro payout" className={inputCls} type="number" min="0" step="0.01" value={premPayout} onChange={(e) => setPremPayout(e.target.value)} required />
          <input aria-label="Pro max capacity" className={inputCls} type="number" min="0" value={premCapacity} onChange={(e) => setPremCapacity(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded" />
          <span className="text-sm text-ink-secondary">Featured on homepage</span>
        </label>
      </div>

      <div>
        <label className={labelCls}>Launch stage</label>
        <select
          value={launchStage}
          onChange={(e) => setLaunchStage(e.target.value as LaunchStage)}
          className={selectCls}
        >
          <option value="live">Live (purchasable)</option>
          <option value="coming_soon">Coming soon (notify-me only)</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-[13px] font-medium text-ink">Recurring contract</label>
        <button
          type="button"
          onClick={() => setIsRecurring(v => !v)}
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors',
            isRecurring ? 'bg-sky' : 'bg-surface-raised',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              isRecurring ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
        <span className="text-[13px] text-ink-muted">
          {isRecurring ? 'Rolls over (no deadline)' : 'One-time event (expires at deadline)'}
        </span>
      </div>

      <div className="flex gap-3 items-center pt-2">
        {canCancelMarket && (
          <button
            type="button"
            onClick={handleCancelMarket}
            disabled={isPending}
            className="rounded-md border border-danger px-4 py-2 text-sm text-danger hover:bg-danger-bg disabled:opacity-60"
          >
            Cancel market
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push('/admin/contracts')}
          className="ml-auto rounded-md border border-border px-4 py-2 text-sm text-ink-secondary hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-sky px-5 py-2 text-sm font-bold text-on-sky disabled:opacity-60 hover:bg-sky-deep"
        >
          {isPending ? 'Saving…' : 'Save Contract'}
        </button>
      </div>
    </form>
  )
}
