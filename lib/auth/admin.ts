import { createClient, createServiceClient } from '@/lib/supabase/server'

export type AdminDenial = 'Unauthorized' | 'MFA_REQUIRED' | 'Forbidden'

/**
 * The bar for every admin read and write: signed in, AAL2 (verified TOTP MFA,
 * PCI Req 8) and role = admin. Call it next to the data, in each page and
 * action — never rely on the admin layout alone: Next renders pages in
 * parallel with their layout and ships them in the RSC payload even when the
 * layout swaps them for the MFA gate.
 */
export async function checkAdmin(): Promise<{ ok: true; userId: string } | { ok: false; reason: AdminDenial }> {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { ok: false, reason: 'Unauthorized' }

  const { data: aalData } = await userClient.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalData?.currentLevel !== 'aal2') return { ok: false, reason: 'MFA_REQUIRED' }

  const { data: profile } = await createServiceClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if ((profile as { role: string } | null)?.role !== 'admin') return { ok: false, reason: 'Forbidden' }

  return { ok: true, userId: user.id }
}
