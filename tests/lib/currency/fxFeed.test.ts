import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseBanxico, parseBanguat, refreshFxRates } from '@/lib/currency/fxFeed'
import { loadFxRates } from '@/lib/currency/rates'
import { FX_RATES } from '@/lib/currency/config'

const banxico = (fecha: string, dato: string) => ({
  bmx: { series: [{ idSerie: 'SF43718', titulo: 'FIX', datos: [{ fecha, dato }] }] },
})

const banguat = (fecha: string, referencia: string) =>
  `<?xml version="1.0"?><soap:Envelope><soap:Body><TipoCambioDiaResponse><TipoCambioDiaResult>` +
  `<CambioDolar><VarDolar><fecha>${fecha}</fecha><referencia>${referencia}</referencia></VarDolar></CambioDolar>` +
  `</TipoCambioDiaResult></TipoCambioDiaResponse></soap:Body></soap:Envelope>`

describe('parseBanxico', () => {
  it('reads the latest FIX with an ISO date', () => {
    expect(parseBanxico(banxico('14/11/2026', '18.4512'))).toEqual({
      currency: 'MXN', rate: 18.4512, asOf: '2026-11-14', source: 'banxico_fix',
    })
  })

  it('rejects missing data and implausible values', () => {
    expect(parseBanxico({})).toBeNull()
    expect(parseBanxico(banxico('14/11/2026', 'N/E'))).toBeNull()
    expect(parseBanxico(banxico('14/11/2026', '1845.12'))).toBeNull()
  })
})

describe('parseBanguat', () => {
  it('reads the daily reference rate', () => {
    expect(parseBanguat(banguat('16/11/2026', '7.63914'))).toEqual({
      currency: 'GTQ', rate: 7.63914, asOf: '2026-11-16', source: 'banguat',
    })
  })

  it('rejects malformed or implausible responses', () => {
    expect(parseBanguat('<html>maintenance</html>')).toBeNull()
    expect(parseBanguat(banguat('16/11/2026', '0.13'))).toBeNull()
  })
})

describe('refreshFxRates', () => {
  afterEach(() => vi.unstubAllGlobals())

  function makeDb() {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    return { db: { from: vi.fn().mockReturnValue({ upsert }) }, upsert }
  }

  it('stores both rates when both feeds answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('banxico')
        ? new Response(JSON.stringify(banxico('14/11/2026', '18.45')))
        : new Response(banguat('16/11/2026', '7.64')),
    ))
    const { db, upsert } = makeDb()
    const r = await refreshFxRates(db, 'token')
    expect(r.skipped).toEqual([])
    expect(upsert).toHaveBeenCalledTimes(2)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'MXN', rate: 18.45, as_of: '2026-11-14', source: 'banxico_fix' }),
      { onConflict: 'currency,as_of' },
    )
  })

  it('skips MXN without a token and still stores GTQ', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(banguat('16/11/2026', '7.64'))))
    const { db, upsert } = makeDb()
    const r = await refreshFxRates(db, undefined)
    expect(r.stored.map(q => q.currency)).toEqual(['GTQ'])
    expect(r.skipped).toEqual([{ currency: 'MXN', reason: 'BANXICO_TOKEN not set' }])
    expect(upsert).toHaveBeenCalledTimes(1)
  })

  it('never throws when a feed is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    const { db, upsert } = makeDb()
    const r = await refreshFxRates(db, 'token')
    expect(r.stored).toEqual([])
    expect(r.skipped).toHaveLength(2)
    expect(upsert).not.toHaveBeenCalled()
  })
})

describe('loadFxRates', () => {
  function dbWith(rows: unknown[] | null, error: unknown = null) {
    const order = vi.fn().mockResolvedValue({ data: rows, error })
    const gte = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ gte })
    return { from: vi.fn().mockReturnValue({ select }), gte }
  }

  it('uses the newest row per currency', async () => {
    const db = dbWith([
      { currency: 'MXN', rate: '18.45', as_of: '2026-11-14' },
      { currency: 'GTQ', rate: 7.64, as_of: '2026-11-14' },
      { currency: 'MXN', rate: '18.10', as_of: '2026-11-13' },
    ])
    expect(await loadFxRates(db)).toEqual({ MXN: 18.45, GTQ: 7.64 })
  })

  it('only looks at rows from the last 7 days', async () => {
    const db = dbWith([])
    await loadFxRates(db, new Date('2026-11-16T12:00:00Z'))
    expect(db.gte).toHaveBeenCalledWith('as_of', '2026-11-09')
  })

  it('falls back to the constants per currency when rows are missing or the query fails', async () => {
    expect(await loadFxRates(dbWith([{ currency: 'GTQ', rate: 7.6, as_of: '2026-11-14' }]))).toEqual({
      MXN: FX_RATES.MXN, GTQ: 7.6,
    })
    expect(await loadFxRates(dbWith(null, { message: 'boom' }))).toEqual(FX_RATES)
  })
})
