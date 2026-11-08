import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Header from '@/components/layout/Header'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
}))

vi.mock('@/lib/actions/notifications', () => ({ getUnreadCount: vi.fn().mockResolvedValue(2) }))
vi.mock('@/lib/actions/preferences', () => ({ setLocale: vi.fn() }))

function signedIn(role = 'hedger') {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role } }) }) }) }),
  }
}

describe('Header', () => {
  it('renders the Insu wordmark as the home link', async () => {
    render(await Header())
    expect(screen.getAllByRole('link', { name: 'Insu, inicio' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Insu').length).toBeGreaterThan(0)
  })

  it('offers Iniciar sesión and Crear cuenta when signed out', async () => {
    render(await Header())
    expect(screen.getAllByRole('link', { name: 'Iniciar sesión' })[0]).toHaveAttribute('href', '/auth/login')
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/auth/signup')
  })

  it('links to Mis protecciones and Avisos when signed in, without an admin link for non-admins', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockReturnValueOnce(signedIn() as never)
    render(await Header())
    expect(screen.getByRole('link', { name: 'Mis protecciones' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getAllByRole('link', { name: 'Avisos, 2 sin leer' })[0]).toHaveAttribute('href', '/notifications')
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('shows the admin link to admins only', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockReturnValueOnce(signedIn('admin') as never)
    render(await Header())
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
  })

  it('renders the search field and the ES · EN toggle', async () => {
    render(await Header())
    expect(screen.getByRole('searchbox', { name: 'Buscar protecciones' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Español' })[0]).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a back button instead of the logo on phones when asked', async () => {
    render(await Header({ back: { href: '/' } }))
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/')
  })
})
