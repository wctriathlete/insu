import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import StripePaymentForm from '@/components/markets/StripePaymentForm'

// Mutable holders so individual tests can swap in a live stripe/elements stub.
const stripeMocks = vi.hoisted(() => ({
  stripe: null as unknown,
  elements: null as unknown,
}))

vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn().mockResolvedValue(null) }))
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => stripeMocks.stripe,
  useElements: () => stripeMocks.elements,
}))

describe('StripePaymentForm', () => {
  beforeEach(() => {
    stripeMocks.stripe = null
    stripeMocks.elements = null
  })

  it('renders the pay button with the formatted amount', () => {
    render(<StripePaymentForm clientSecret="pi_secret" amountLabel="$38" onSuccess={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Pagar $38' })).toBeInTheDocument()
  })

  it('disables the pay button when Stripe is not loaded', () => {
    render(<StripePaymentForm clientSecret="pi_secret" amountLabel="$38" onSuccess={vi.fn()} />)
    expect(screen.getByRole('button', { name: /pagar/i })).toBeDisabled()
  })

  it('labels the card field', () => {
    render(<StripePaymentForm clientSecret="pi_secret" amountLabel="$38" onSuccess={vi.fn()} />)
    expect(screen.getByTestId('card-element')).toBeInTheDocument()
    expect(screen.getByText('Tarjeta')).toBeInTheDocument()
  })

  it('keeps the button in processing state until onSuccess resolves', async () => {
    let resolveActivation!: () => void
    const onSuccess = vi.fn(() => new Promise<void>((resolve) => { resolveActivation = resolve }))
    stripeMocks.stripe = { confirmCardPayment: vi.fn().mockResolvedValue({}) }
    stripeMocks.elements = { getElement: () => ({}) }

    render(<StripePaymentForm clientSecret="pi_secret" amountLabel="$38" onSuccess={onSuccess} />)
    await userEvent.click(screen.getByRole('button', { name: /pagar/i }))

    // Card confirmed, activation still in flight: the form must not re-enable.
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: /procesando/i })).toBeDisabled()

    resolveActivation()
    await waitFor(() => expect(screen.getByRole('button', { name: /pagar/i })).not.toBeDisabled())
  })

  it('shows the declined alert, keeps the same intent and lets the person retry', async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue({ error: { message: 'Your card was declined.' } })
    stripeMocks.stripe = { confirmCardPayment }
    stripeMocks.elements = { getElement: () => ({}) }
    const onSuccess = vi.fn()

    render(<StripePaymentForm clientSecret="pi_secret" amountLabel="$38" onSuccess={onSuccess} />)
    await userEvent.click(screen.getByRole('button', { name: /pagar/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Tu tarjeta no pasó. No te cobramos nada.')
    expect(onSuccess).not.toHaveBeenCalled()

    const retry = screen.getByRole('button', { name: 'Intentar de nuevo · $38' })
    expect(retry).not.toBeDisabled()
    await userEvent.click(retry)
    expect(confirmCardPayment).toHaveBeenCalledTimes(2)
    expect(confirmCardPayment).toHaveBeenLastCalledWith('pi_secret', expect.anything())
  })
})
