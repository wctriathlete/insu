import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchGuatemalaFuelPrice,
  parseRegularPriceGTQ,
  pickFreshPricePost,
} from '@/lib/oracle/guatemalaFuelFetcher'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const nowMs = Date.parse('2026-07-22T12:00:00Z')

// Real AGN post 2026-10-26: MEM level reported in prose, delta + exemption savings nearby.
const OCT26_TITLE = 'Ministerio de Energía y Minas reportó disminución de los precios en los combustibles en el país'
const OCT26_CONTENT = '<p>Ciudad de Guatemala, 26 oct (AGN). – El Ministerio de Energía y Minas (MEM), informó que este domingo 25 de octubre se reportó una disminución en los precios de los combustibles en el país. En la gasolina superior fue una reducción superior a un quetzal y en la gasolina regular de 1.30 . Dejando los precios en 34.19 la superior , 31.69 la regular y el diésel en 42.69 quetzales por galón.</p><p>Con base en los precios monitoreados el 28 de septiembre, el ahorro por galón puede alcanzar Q9.05 en la gasolina superior , Q8.33 en la regular y Q6.45 en el diésel .</p>'

function post(overrides: Partial<{ title: string; content: string; date_gmt: string }> = {}) {
  return {
    title: { rendered: overrides.title ?? 'Así quedaron los precios de los combustibles para esta semana' },
    content: { rendered: overrides.content ?? '<p>La gasolina superior se ubicó en Q41.09, la regular en Q40.09 y el diésel en Q42.29 por galón.</p>' },
    date_gmt: overrides.date_gmt ?? '2026-07-21T06:00:00',
  }
}

describe('parseRegularPriceGTQ', () => {
  it('extracts the regular price when the number follows "regular"', () => {
    expect(parseRegularPriceGTQ('la regular en Q40.09 y el diésel')).toBeCloseTo(40.09, 2)
  })
  it('extracts the regular price when "quetzales" precedes "regular"', () => {
    expect(parseRegularPriceGTQ('40.09 quetzales para la gasolina regular')).toBeCloseTo(40.09, 2)
  })
  it('strips HTML tags before matching', () => {
    expect(parseRegularPriceGTQ('<p>la <b>regular</b> en Q40.09</p>')).toBeCloseTo(40.09, 2)
  })
  it('returns null when no regular price is present', () => {
    expect(parseRegularPriceGTQ('no fuel prices in this text at all')).toBeNull()
  })
  it('extracts regular (not the adjacent diesel price) from the real MEM table phrasing', () => {
    const real = 'se estableció un precio de referencia de 32.09 quetzales para la gasolina superior, 31.09 para la regular y para el diésel 27.29.'
    expect(parseRegularPriceGTQ(real)).toBeCloseTo(31.09, 2)
  })
  it('does not extract a price from a centavos-delta news sentence', () => {
    const delta = 'incrementos de 50 centavos por galón en la superior, 49 centavos por galón en la regular y un quetzal 96 centavos en el diésel.'
    expect(parseRegularPriceGTQ(delta)).toBeNull()
  })
  it('extracts regular from the "Dejando los precios en X la superior, Y la regular" phrasing', () => {
    expect(parseRegularPriceGTQ(OCT26_CONTENT)).toBeCloseTo(31.69, 2)
  })
})

describe('pickFreshPricePost', () => {
  it('picks the most recent series post within 14 days', () => {
    const p = pickFreshPricePost([post()], nowMs)
    expect(p).not.toBeNull()
  })
  it('rejects posts older than 14 days', () => {
    const old = post({ date_gmt: '2026-06-01T06:00:00' })
    expect(pickFreshPricePost([old], nowMs)).toBeNull()
  })
  it('rejects posts whose title is not the price series', () => {
    const off = post({ title: 'Presidente analiza el alza de combustibles' })
    expect(pickFreshPricePost([off], nowMs)).toBeNull()
  })
  it('rejects a news article whose title lacks the price-series phrase', () => {
    const off = post({ title: 'Tensiones geopolíticas internacionales impactan precios de combustibles' })
    expect(pickFreshPricePost([off], nowMs)).toBeNull()
  })
  it('accepts a MEM-report post whose content announces the price levels', () => {
    const p = pickFreshPricePost([post({ title: OCT26_TITLE, content: OCT26_CONTENT, date_gmt: '2026-07-21T17:00:41' })], nowMs)
    expect(p).not.toBeNull()
  })
  it('skips a newer unrelated post and picks the level-announcing one behind it', () => {
    const news = post({ title: 'Feria del Agricultor pondrá a disposición productos', content: '<p>Fiambre.</p>', date_gmt: '2026-07-21T18:00:00' })
    const mem = post({ title: OCT26_TITLE, content: OCT26_CONTENT, date_gmt: '2026-07-21T17:00:41' })
    expect(pickFreshPricePost([news, mem], nowMs)?.title.rendered).toBe(OCT26_TITLE)
  })
  it('accepts a fresh post whose date_gmt already ends in Z', () => {
    const p = pickFreshPricePost([post({ date_gmt: '2026-07-21T06:00:00Z' })], nowMs)
    expect(p).not.toBeNull()
  })
})

describe('fetchGuatemalaFuelPrice', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(nowMs)
  })

  function mockAgn(posts: unknown[]) {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(posts) })
  }

  it('returns the regular price with the correct reading shape', async () => {
    mockAgn([post()])
    const r = await fetchGuatemalaFuelPrice('regular')
    expect(r.source).toBe('agn_mem')
    expect(r.reading_type).toBe('fuel')
    expect(r.value.gas_price_quetzales).toBeCloseTo(40.09, 2)
    expect(r.value.fuel_type).toBe('regular')
    expect(r.value.reference_week).toBe('2026-07-21')
  })

  it('reads the regular level from a real MEM-report post (2026-10-26 phrasing)', async () => {
    mockAgn([post({ title: OCT26_TITLE, content: OCT26_CONTENT, date_gmt: '2026-07-21T17:00:41' })])
    const r = await fetchGuatemalaFuelPrice('regular')
    expect(r.value.gas_price_quetzales).toBeCloseTo(31.69, 2)
  })

  it('throws when there is no fresh price post', async () => {
    mockAgn([post({ date_gmt: '2026-06-01T06:00:00' })])
    await expect(fetchGuatemalaFuelPrice('regular')).rejects.toThrow(/no fresh/i)
  })

  it('throws when the price cannot be parsed', async () => {
    mockAgn([post({ content: '<p>Sin precios esta semana.</p>' })])
    await expect(fetchGuatemalaFuelPrice('regular')).rejects.toThrow(/parse/i)
  })

  it('throws when the parsed price is out of plausible bounds', async () => {
    mockAgn([post({ content: '<p>la regular en Q95.00 por galón.</p>' })])
    await expect(fetchGuatemalaFuelPrice('regular')).rejects.toThrow(/out of bounds/i)
  })

  it('throws on a non-ok AGN response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 })
    await expect(fetchGuatemalaFuelPrice('regular')).rejects.toThrow('AGN feed error: 503')
  })

  it('rejects unsupported fuel types', async () => {
    await expect(fetchGuatemalaFuelPrice('superior')).rejects.toThrow(/only supports 'regular'/i)
  })
  it('propagates a network error from fetch', async () => {
    mockFetch.mockRejectedValue(new Error('network failure'))
    await expect(fetchGuatemalaFuelPrice('regular')).rejects.toThrow(/network failure/i)
  })
})
