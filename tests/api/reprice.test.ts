import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/pricing/reprice', () => ({
  repriceAll: vi.fn().mockResolvedValue(4),
}))

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn(() => ({})) }))

const refreshFxRates = vi.fn()
vi.mock('@/lib/currency/fxFeed', () => ({ refreshFxRates: (...a: unknown[]) => refreshFxRates(...a) }))

async function makeRequest(secret: string) {
  const { POST } = await import('@/app/api/reprice/route')
  return POST(new NextRequest('http://localhost/api/reprice', {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  }))
}

describe('POST /api/reprice', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret'
    refreshFxRates.mockReset().mockResolvedValue({ stored: [], skipped: [] })
    vi.resetModules()
  })

  it('returns 401 with wrong secret', async () => {
    const res = await makeRequest('wrong')
    expect(res.status).toBe(401)
  })

  it('returns 200 and repriced count with correct secret', async () => {
    const res = await makeRequest('test-secret')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ repriced: 4, fx: { stored: [], skipped: [] } })
  })

  it('refreshes FX rates before repricing and reports them', async () => {
    refreshFxRates.mockResolvedValueOnce({
      stored: [{ currency: 'GTQ', rate: 7.64, asOf: '2026-11-16', source: 'banguat' }],
      skipped: [{ currency: 'MXN', reason: 'BANXICO_TOKEN not set' }],
    })
    const res = await makeRequest('test-secret')
    expect(await res.json()).toEqual({
      repriced: 4,
      fx: { stored: ['GTQ 7.64 (2026-11-16)'], skipped: [{ currency: 'MXN', reason: 'BANXICO_TOKEN not set' }] },
    })
  })
})
