// lib/currency/fxFeed.ts
//
// Daily official USD exchange rates:
//   MXN — Banxico FIX (series SF43718), needs a free SIE API token (BANXICO_TOKEN).
//   GTQ — Banguat's daily reference rate (TipoCambioDia SOAP service), no key.
// Each source is fetched independently; a failure or an implausible value for
// one never blocks the other, and callers fall back to FX_RATES when a currency
// has no fresh row.
import type { LocalCurrency } from './config'

export interface FxQuote {
  currency: LocalCurrency
  rate: number
  asOf: string // 'YYYY-MM-DD'
  source: 'banxico_fix' | 'banguat'
}

interface DbClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

const BANXICO_URL = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno'
const BANGUAT_URL = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx'

/** Local units per USD outside these bounds means a broken feed, not a market move. */
export const PLAUSIBLE: Record<LocalCurrency, [number, number]> = {
  MXN: [10, 30],
  GTQ: [5, 12],
}

/** 'DD/MM/YYYY' → 'YYYY-MM-DD'. */
function dmyToIso(dmy: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy.trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

function plausible(currency: LocalCurrency, rate: number): boolean {
  const [lo, hi] = PLAUSIBLE[currency]
  return Number.isFinite(rate) && rate >= lo && rate <= hi
}

export function parseBanxico(body: unknown): FxQuote | null {
  // { bmx: { series: [{ idSerie, datos: [{ fecha: '14/11/2026', dato: '18.4512' }] }] } }
  const datos = (body as { bmx?: { series?: { datos?: { fecha: string; dato: string }[] }[] } })
    ?.bmx?.series?.[0]?.datos
  const last = datos?.[datos.length - 1]
  if (!last) return null
  const rate = Number(last.dato.replace(/,/g, ''))
  const asOf = dmyToIso(last.fecha)
  if (!asOf || !plausible('MXN', rate)) return null
  return { currency: 'MXN', rate, asOf, source: 'banxico_fix' }
}

export function parseBanguat(xml: string): FxQuote | null {
  const fecha = /<fecha>([^<]+)<\/fecha>/.exec(xml)?.[1]
  const referencia = /<referencia>([^<]+)<\/referencia>/.exec(xml)?.[1]
  if (!fecha || !referencia) return null
  const rate = Number(referencia)
  const asOf = dmyToIso(fecha)
  if (!asOf || !plausible('GTQ', rate)) return null
  return { currency: 'GTQ', rate, asOf, source: 'banguat' }
}

async function fetchMxn(token: string): Promise<FxQuote | null> {
  const res = await fetch(BANXICO_URL, {
    headers: { 'Bmx-Token': token, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Banxico HTTP ${res.status}`)
  return parseBanxico(await res.json())
}

async function fetchGtq(): Promise<FxQuote | null> {
  const res = await fetch(BANGUAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: '"http://www.banguat.gob.gt/variables/ws/TipoCambioDia"',
    },
    body:
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
      '<TipoCambioDia xmlns="http://www.banguat.gob.gt/variables/ws/" />' +
      '</soap:Body></soap:Envelope>',
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Banguat HTTP ${res.status}`)
  return parseBanguat(await res.text())
}

export interface FxRefreshResult {
  stored: FxQuote[]
  skipped: { currency: LocalCurrency; reason: string }[]
}

/** Fetch today's official rates and upsert them. Never throws. */
export async function refreshFxRates(
  db: DbClient,
  token: string | undefined = process.env.BANXICO_TOKEN,
): Promise<FxRefreshResult> {
  const result: FxRefreshResult = { stored: [], skipped: [] }
  const jobs: [LocalCurrency, () => Promise<FxQuote | null>][] = [
    ['MXN', () => (token ? fetchMxn(token) : Promise.reject(new Error('BANXICO_TOKEN not set')))],
    ['GTQ', fetchGtq],
  ]

  await Promise.all(
    jobs.map(async ([currency, run]) => {
      try {
        const quote = await run()
        if (!quote) {
          result.skipped.push({ currency, reason: 'unparseable or implausible rate' })
          return
        }
        const { error } = await db.from('fx_rates').upsert(
          { currency: quote.currency, as_of: quote.asOf, rate: quote.rate, source: quote.source, fetched_at: new Date().toISOString() },
          { onConflict: 'currency,as_of' },
        )
        if (error) throw new Error(error.message)
        result.stored.push(quote)
      } catch (e) {
        result.skipped.push({ currency, reason: e instanceof Error ? e.message : String(e) })
      }
    }),
  )
  return result
}
