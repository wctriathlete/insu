import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCheckAdmin, mockServiceFrom } = vi.hoisted(() => ({
  mockCheckAdmin: vi.fn(),
  mockServiceFrom: vi.fn(),
}))

vi.mock('@/lib/auth/admin', () => ({ checkAdmin: mockCheckAdmin }))
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockServiceFrom, auth: { admin: { listUsers: vi.fn() } } }),
}))

import { getUserActivity } from '@/lib/actions/adminActivity'

describe('getUserActivity', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(['Unauthorized', 'MFA_REQUIRED', 'Forbidden'])(
    'refuses to read any user data when the caller is %s',
    async (reason) => {
      mockCheckAdmin.mockResolvedValue({ ok: false, reason })
      await expect(getUserActivity()).rejects.toThrow(reason)
      expect(mockServiceFrom).not.toHaveBeenCalled()
    },
  )
})
