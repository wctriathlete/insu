import { getUserActivity } from '@/lib/actions/adminActivity'
import { UserActivityTable } from '@/components/admin/activity/UserActivityTable'
import { checkAdmin } from '@/lib/auth/admin'

export default async function AdminActivityPage() {
  // Admin + MFA checked here, not just in the layout: Next renders this page
  // and ships its data even when the layout swaps in the MFA gate.
  if (!(await checkAdmin()).ok) return null

  const users = await getUserActivity()

  return (
    <div className="p-6">
      <h1 className="mb-1 text-lg font-semibold text-ink">User activity</h1>
      <p className="mb-4 text-[13px] text-ink-muted">
        {users.length} user{users.length === 1 ? '' : 's'} · click a row for the full timeline
      </p>
      <UserActivityTable users={users} />
    </div>
  )
}
