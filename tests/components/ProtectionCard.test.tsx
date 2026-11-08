import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ProtectionCard } from '@/components/dashboard/ProtectionCard'
import type { HedgerPositionWithContract } from '@/lib/types'

const corridor = {
  name: 'Periférico Sur → Centro (Mañana)',
  window_start: '07:00:00',
  window_end: '10:00:00',
  baseline_duration_s: 1800, // 30 min normal → line at 45 min
  route_name: null,
}

function makePosition(overrides: Partial<HedgerPositionWithContract> = {}): HedgerPositionWithContract {
  return {
    id: 'pos-1',
    user_id: 'user-1',
    contract_id: 'contract-1',
    tier_id: 'tier-1',
    premium_paid_usd: 5,
    payout_amount_usd: 100,
    premium_paid_mxn: 0,
    payout_amount_mxn: 0,
    currency: 'USD',
    payment_provider: 'stripe',
    payment_intent_id: null,
    status: 'active',
    purchased_at: '2026-11-04T18:00:00Z', // 12:00 market time
    expires_at: '2026-11-11T18:00:00Z',
    coverage_period_days: 7,
    payouts_remaining: 1,
    payouts_made: 0,
    contract: {
      id: 'contract-1',
      slug: 'periferico-sur-centro-manana',
      title: 'Periférico Sur → Centro — Protección Mañana',
      trigger_type: 'urban',
      status: 'active',
      is_recurring: true,
      trigger_condition: { metric: 'traffic_index', operator: 'gt', threshold: 50 },
      location: { lat: 0, lng: 0, city: 'Mexico City', country: 'MX' },
      corridor,
    },
    tier: { name: 'basic', base_probability: 0.05, max_payouts: 1 },
    ...overrides,
  }
}

describe('ProtectionCard (owned)', () => {
  afterEach(() => vi.useRealTimers())

  it('names the route and window, never the raw trigger_type', () => {
    render(<ProtectionCard position={makePosition()} displayMode="USD" />)
    expect(screen.getByRole('heading', { name: 'Periférico Sur → Centro' })).toBeInTheDocument()
    expect(screen.getByText('Mañanas 07:00–10:00 · Básica · una vez')).toBeInTheDocument()
    expect(screen.queryByText(/urban/)).not.toBeInTheDocument()
  })

  it('shows Pagaste · Recibes si pasa · Termina in the chosen currency', () => {
    render(<ProtectionCard position={makePosition()} displayMode="LOCAL" />)
    expect(screen.getByText('Pagaste').nextSibling).toHaveTextContent('MX$85')
    expect(screen.getByText('Recibes si pasa').nextSibling).toHaveTextContent('MX$1,700')
    expect(screen.getByText('Termina')).toBeInTheDocument()
  })

  it('counts covered mornings in the day strip caption', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-07T20:00:00Z')) // Nov 7, 14:00 market time
    render(<ProtectionCard position={makePosition()} displayMode="USD" />)
    // Mornings Nov 5–11 are covered (Nov 4's had passed at purchase): Nov 7 is
    // the 3rd, with Nov 8–11 still ahead.
    expect(screen.getByText('Mañana 3 de 7 · quedan 4')).toBeInTheDocument()
  })

  it('shows the live reading against the payout line', () => {
    const position = makePosition({
      latest_reading: {
        value: { traffic_index: 13, duration_s: 2040 },
        read_at: new Date().toISOString(),
        source: 'google_maps',
        trigger_met: false,
      },
    })
    render(<ProtectionCard position={position} displayMode="USD" />)
    expect(screen.getByText(/Te pagamos desde 45 min de trayecto/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Línea de pago 45 min/ })).toBeInTheDocument()
  })

  it('marks Pro protections that already paid with the payout count', () => {
    const position = makePosition({
      tier: { name: 'premium', base_probability: 0.05, max_payouts: 3 },
      payouts_made: 1,
      payouts_remaining: 2,
    })
    render(<ProtectionCard position={position} displayMode="USD" />)
    expect(screen.getByText('1 pago')).toBeInTheDocument()
    expect(screen.getByText('Recibes si pasa').nextSibling).toHaveTextContent('$200')
  })

  it('shows Terminada and hides the live box once expired', () => {
    render(<ProtectionCard position={makePosition({ status: 'expired' })} displayMode="USD" />)
    expect(screen.getByText('Terminada')).toBeInTheDocument()
    expect(screen.getByText('Terminó')).toBeInTheDocument()
    expect(screen.queryByText(/Te pagamos desde/)).not.toBeInTheDocument()
  })
})
