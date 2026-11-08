import { describe, it, expect, vi, beforeEach } from 'vitest'

// The admin layout's gate does not stop pages from rendering (Next renders
// segments in parallel and ships them in the RSC payload), so every admin page
// must refuse on its own: render nothing and fetch nothing.
const { mockCheckAdmin, mockCreateClient, mockCreateServiceClient } = vi.hoisted(() => ({
  mockCheckAdmin: vi.fn(),
  mockCreateClient: vi.fn(),
  mockCreateServiceClient: vi.fn(),
}))

vi.mock('@/lib/auth/admin', () => ({ checkAdmin: mockCheckAdmin }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
  createServiceClient: mockCreateServiceClient,
}))
vi.mock('@/lib/actions/adminActivity', () => ({ getUserActivity: vi.fn() }))

const params = Promise.resolve({ id: 'c1' })
const searchParams = Promise.resolve({})

const pages: Array<[string, () => Promise<unknown>]> = [
  ['contracts', async () => (await import('@/app/admin/contracts/page')).default()],
  ['contracts/[id]', async () => (await import('@/app/admin/contracts/[id]/page')).default({ params })],
  ['contracts/new', async () => (await import('@/app/admin/contracts/new/page')).default()],
  ['oracle', async () => (await import('@/app/admin/oracle/page')).default()],
  ['scenario', async () => (await import('@/app/admin/scenario/page')).default()],
  ['payouts', async () => (await import('@/app/admin/payouts/page')).default()],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ['trigger', async () => (await import('@/app/admin/trigger/page')).default({ searchParams } as any)],
  ['activity', async () => (await import('@/app/admin/activity/page')).default()],
]

describe('admin pages without admin + MFA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckAdmin.mockResolvedValue({ ok: false, reason: 'MFA_REQUIRED' })
  })

  it.each(pages)('/admin/%s renders nothing and reads no data', async (_name, render) => {
    expect(await render()).toBeNull()
    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockCreateServiceClient).not.toHaveBeenCalled()
  })
})
