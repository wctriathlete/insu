// lib/currency/rates.ts
//
// The rates actually used for display and premium_mxn: the latest official rate
// per currency from fx_rates (refreshed daily, see fxFeed.ts), falling back to
// the FX_RATES constants when a currency has no row or its row is stale.
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { FX_RATES, type LocalCurrency } from './config'

export type FxRates = Record<LocalCurrency, number>

interface DbClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

/** Banks skip weekends and holidays; older than this means the feed is broken. */
export const MAX_RATE_AGE_DAYS = 7

export async function loadFxRates(db: DbClient, now: Date = new Date()): Promise<FxRates> {
  const rates: FxRates = { ...FX_RATES }
  const cutoff = new Date(now.getTime() - MAX_RATE_AGE_DAYS * 86_400_000).toISOString().slice(0, 10)
  try {
    const { data, error } = await db
      .from('fx_rates')
      .select('currency, rate, as_of')
      .gte('as_of', cutoff)
      .order('as_of', { ascending: false })
    if (error || !data) return rates
    const seen = new Set<string>()
    for (const row of data as { currency: LocalCurrency; rate: number | string }[]) {
      if (seen.has(row.currency) || !(row.currency in rates)) continue
      seen.add(row.currency)
      const rate = Number(row.rate)
      if (rate > 0) rates[row.currency] = rate
    }
  } catch {
    // Display must never break on a rates lookup; the constants are a safe floor.
  }
  return rates
}

/** Request-deduped read with the public anon key (fx_rates is public data). */
export const getFxRates = cache(async (): Promise<FxRates> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { ...FX_RATES }
  return loadFxRates(createClient(url, key, { auth: { persistSession: false } }))
})
