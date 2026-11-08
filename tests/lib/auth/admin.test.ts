import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockGetAal, mockRole } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetAal: vi.fn(),
  mockRole: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser, mfa: { getAuthenticatorAssuranceLevel: mockGetAal } },
  }),
  createServiceClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: mockRole }) }) }),
  }),
}))

import { checkAdmin } from '@/lib/auth/admin'

describe('checkAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockGetAal.mockResolvedValue({ data: { currentLevel: 'aal2' } })
    mockRole.mockResolvedValue({ data: { role: 'admin' } })
  })

  it('passes a signed-in admin with MFA', async () => {
    expect(await checkAdmin()).toEqual({ ok: true, userId: 'admin-1' })
  })

  it('rejects a signed-out caller', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect(await checkAdmin()).toEqual({ ok: false, reason: 'Unauthorized' })
  })

  it('rejects an admin who has only entered a password (aal1)', async () => {
    mockGetAal.mockResolvedValue({ data: { currentLevel: 'aal1' } })
    expect(await checkAdmin()).toEqual({ ok: false, reason: 'MFA_REQUIRED' })
  })

  it('rejects a non-admin even with MFA', async () => {
    mockRole.mockResolvedValue({ data: { role: 'user' } })
    expect(await checkAdmin()).toEqual({ ok: false, reason: 'Forbidden' })
  })
})
