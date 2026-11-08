import AuthScreen from '@/components/auth/AuthScreen'
import { safeNext } from '@/lib/auth/safeNext'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; for?: string }>
}) {
  const q = await searchParams
  return <AuthScreen mode="signup" next={safeNext(q.next)} forSlug={q.for ?? null} />
}
