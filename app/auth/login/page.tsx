import AuthScreen from '@/components/auth/AuthScreen'
import { safeNext } from '@/lib/auth/safeNext'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; for?: string; error?: string }>
}) {
  const q = await searchParams
  return <AuthScreen mode="login" next={safeNext(q.next)} forSlug={q.for ?? null} error={q.error} />
}
