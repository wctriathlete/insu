import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ContractCheckout, { type DetailBundle } from '@/components/markets/ContractCheckout'
import type { ContractDetailData, CoverageTier } from '@/lib/types'

const mocks = vi.hoisted(() => ({ push: vi.fn(), createIntent: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
  usePathname: () => '/markets/x',
}))
vi.mock('@/lib/actions/purchase', () => ({
  createHedgerPaymentIntent: mocks.createIntent,
  activatePositionByPaymentIntent: vi.fn(),
}))
vi.mock('@/lib/actions/launch-interest', () => ({ toggleLaunchInterest: vi.fn().mockResolvedValue(true) }))
vi.mock('@/components/markets/CorridorMap', () => ({ CorridorMap: () => <div data-testid="map" /> }))
vi.mock('@/components/markets/StripePaymentForm', () => ({
  default: ({ amountLabel }: { amountLabel: string }) => <div data-testid="stripe">{amountLabel}</div>,
}))

function tier(over: Partial<CoverageTier>): CoverageTier {
  return {
    id: 'basic',
    contract_id: 'c1',
    name: 'basic',
    premium_usd: 5,
    payout_usd: 100,
    premium_mxn: 85,
    payout_mxn: 1700,
    max_capacity_usd: 5000,
    current_capacity_usd: 5000,
    base_probability: 0.01,
    max_payouts: 1,
    last_priced_at: null,
    pricing_inputs: null,
    ...over,
  }
}

function bundle(tiers: CoverageTier[] = [tier({}), tier({ id: 'pro', name: 'premium', max_payouts: 3 })]): DetailBundle {
  const contract = {
    id: 'c1',
    slug: 'flood-heavy-rain-cdmx',
    title: 'Heavy-rain flooding in CDMX (≥ 30 mm/h)?',
    description: null,
    category_id: 'cat',
    category: { id: 'cat', name: 'Urban', slug: 'urban', color: '', icon_url: null, display_order: 1 },
    status: 'active',
    trigger_type: 'flood',
    trigger_condition: { metric: 'rain_1h_mm', operator: 'gte', threshold: 30 },
    trigger_deadline: null,
    is_recurring: true,
    location: { lat: 19.4, lng: -99.1, city: 'CDMX', country: 'MX' },
    icon_url: null,
    total_volume_usd: 0,
    total_volume_mxn: 0,
    is_featured: false,
    launch_stage: 'live',
    settled_outcome: null,
    created_by: 'x',
    created_at: '2026-07-01T00:00:00Z',
    settled_at: null,
    coverage_tiers: tiers,
    corridor: null,
    pricing_history: [],
  } as unknown as ContractDetailData
  return { slug: contract.slug, contract, latestReading: null, metricSeries: [] }
}

function renderCheckout(b = bundle(), userId: string | null = 'user-1') {
  return render(
    <ContractCheckout bundle={b} sibling={null} userId={userId} displayMode="USD" watchingCapacity={false} />,
  )
}

describe('ContractCheckout', () => {
  beforeEach(() => {
    mocks.push.mockClear()
    mocks.createIntent.mockReset()
  })

  it('shows the plain condition, never the stored question title or raw trigger', () => {
    renderCheckout()
    expect(screen.getByRole('heading', { level: 1, name: 'Lluvia fuerte' })).toBeInTheDocument()
    expect(screen.getByText(/Si llueven 30 mm o más en una hora, te pagamos/)).toBeInTheDocument()
    expect(screen.queryByText(/flooding in CDMX/)).not.toBeInTheDocument()
    expect(screen.queryByText(/rain_1h_mm/)).not.toBeInTheDocument()
  })

  it('chooses period and tier once and states the deal in the summary', () => {
    renderCheckout()
    const period = screen.getByRole('group', { name: 'Periodo de protección' })
    expect(within(period).getByRole('radio', { name: '7 días' })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Básica · una vez/ })).toBeChecked()
    expect(screen.getByText('Pagas hoy')).toBeInTheDocument()
    expect(screen.getByText('Recibes si pasa').nextSibling).toHaveTextContent('$100')
    expect(screen.getByText(/Se cobra en USD/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Proteger 7 días' })).toBeEnabled()
  })

  it('dims Pro on a 1-day period and says why', async () => {
    renderCheckout()
    await userEvent.click(screen.getByRole('radio', { name: '1 día' }))
    expect(screen.getByRole('radio', { name: /Pro · hasta 3 veces/ })).toBeDisabled()
    expect(screen.getAllByText('Pro está disponible desde 3 días de protección.').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Proteger 1 día' })).toBeEnabled()
  })

  it('sends signed-out people to sign-up with their selection, then back to payment', async () => {
    renderCheckout(bundle(), null)
    await userEvent.click(screen.getByRole('button', { name: 'Proteger 7 días' }))
    expect(mocks.createIntent).not.toHaveBeenCalled()
    const url = new URL(mocks.push.mock.calls[0][0], 'http://x')
    expect(url.pathname).toBe('/auth/signup')
    expect(url.searchParams.get('next')).toBe('/markets/flood-heavy-rain-cdmx?period=7&tier=basic&checkout=1')
    expect(url.searchParams.get('for')).toBe('flood-heavy-rain-cdmx')
  })

  it('opens the card form inline once the intent exists', async () => {
    mocks.createIntent.mockResolvedValue({ clientSecret: 'pi_1_secret_2', expiresAt: '2026-11-14T00:00:00Z' })
    renderCheckout()
    await userEvent.click(screen.getByRole('button', { name: 'Proteger 7 días' }))
    expect(mocks.createIntent).toHaveBeenCalledWith('basic', 7)
    expect(await screen.findByTestId('stripe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambiar elección' })).toBeInTheDocument()
  })

  it('translates server errors by code', async () => {
    mocks.createIntent.mockResolvedValue({ error: 'The trigger is currently active', code: 'triggerActive' })
    renderCheckout()
    await userEvent.click(screen.getByRole('button', { name: 'Proteger 7 días' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La condición está activa ahora mismo')
  })

  it('disables the main button with a reason when the pool has no room', () => {
    renderCheckout(bundle([tier({ current_capacity_usd: 0 }), tier({ id: 'pro', name: 'premium', max_payouts: 3, current_capacity_usd: 0 })]))
    expect(screen.getByRole('button', { name: 'Proteger 7 días' })).toBeDisabled()
    expect(screen.getByText('Sin cupo por ahora.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avísame cuando haya cupo' })).toBeInTheDocument()
  })

  it('links to providing capital quietly, not as an equal button', () => {
    renderCheckout()
    expect(screen.getByRole('link', { name: /Aportar capital a esta protección/ })).toHaveAttribute('href', '/earn/flood-heavy-rain-cdmx')
  })
})
