import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockConstructEvent, mockUpdate, mockRpc, mockCreateNotification } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockUpdate: vi.fn(),
  mockRpc: vi.fn(),
  mockCreateNotification: vi.fn(),
}))

vi.mock('@/lib/notifications/create', () => ({
  createNotification: mockCreateNotification,
}))

vi.mock('stripe', () => ({
  default: vi.fn(function MockStripe() {
    return { webhooks: { constructEvent: mockConstructEvent } }
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: (...args: unknown[]) => mockUpdate(...args),
    })),
    rpc: mockRpc,
  })),
}))

function makeUpdateChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  return chain
}

async function makeRequest() {
  vi.resetModules()
  const { POST } = await import('@/app/api/stripe-webhook/route')
  return POST(new NextRequest('http://localhost/api/stripe-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    body: '{}',
  }))
}

describe('POST /api/stripe-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.STRIPE_SECRET_KEY = 'sk_test_key'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test',
          metadata: { position_type: 'hedger', position_id: 'pos-1' },
        },
      },
    })
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('activates a pending hedger position and increments contract volume', async () => {
    const chain = makeUpdateChain({
      data: { tier_id: 't1', premium_paid_usd: 240.27, contract_id: 'c1' },
      error: null,
    })
    mockUpdate.mockReturnValue(chain)

    const res = await makeRequest()
    expect(res.status).toBe(200)

    // The activation must only touch positions still awaiting payment —
    // otherwise it races the activation server action and double-counts.
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending_payment')
    expect(mockRpc).toHaveBeenCalledWith('increment_contract_volume', {
      p_contract_id: 'c1',
      p_amount: 240.27,
    })
  })

  it('does nothing when the position was already activated by the server action', async () => {
    mockUpdate.mockReturnValue(makeUpdateChain({ data: null, error: { message: 'no rows' } }))

    const res = await makeRequest()
    expect(res.status).toBe(200)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('does not credit the premium to pool capacity', async () => {
    mockUpdate.mockReturnValue(makeUpdateChain({
      data: { tier_id: 't1', premium_paid_usd: 240.27, contract_id: 'c1' },
      error: null,
    }))

    await makeRequest()
    // Pool capacity comes from provider deposits; the primary activation path
    // (the server action) never credits premiums to capacity, so the webhook
    // fallback must not either.
    expect(mockRpc).not.toHaveBeenCalledWith('increment_tier_capacity', expect.anything())
  })

  it('tells the buyer their protection is active when the webhook activates it', async () => {
    const chain = makeUpdateChain({
      data: { tier_id: 't1', premium_paid_usd: 240.27, contract_id: 'c1', user_id: 'u1' },
      error: null,
    })
    mockUpdate.mockReturnValue(chain)

    await makeRequest()
    // The buyer may have closed the tab before the server action ran, so this
    // fallback is the only path that can tell them they are covered.
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('user_id'))
    expect(mockCreateNotification).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: 'u1',
      type: 'protection_purchased',
      contractId: 'c1',
      body: expect.stringContaining('POS-1'),
    }))
  })

  it('does not notify when the server action already activated (and notified)', async () => {
    mockUpdate.mockReturnValue(makeUpdateChain({ data: null, error: { message: 'no rows' } }))

    await makeRequest()
    expect(mockCreateNotification).not.toHaveBeenCalled()
  })

  describe('provider deposits', () => {
    beforeEach(() => {
      mockConstructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test', metadata: { position_type: 'provider', position_id: 'prov-1' } } },
      })
    })

    it('activates a pending deposit and credits its capital to the pool', async () => {
      const chain = makeUpdateChain({ data: { tier_id: 't1', capital_deposited_usd: 10 }, error: null })
      mockUpdate.mockReturnValue(chain)

      const res = await makeRequest()
      expect(res.status).toBe(200)
      expect(chain.eq).toHaveBeenCalledWith('status', 'pending_payment')
      expect(mockRpc).toHaveBeenCalledWith('increment_tier_capacity', { p_tier_id: 't1', p_amount: 10 })
    })

    it('does not credit capacity when the deposit was already activated', async () => {
      mockUpdate.mockReturnValue(makeUpdateChain({ data: null, error: { message: 'no rows' } }))

      const res = await makeRequest()
      expect(res.status).toBe(200)
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })
})
