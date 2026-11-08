'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function LogoutButton({ className }: { className?: string }) {
  const t = useTranslations('nav')
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn('flex min-h-touch items-center text-body font-bold text-danger hover:underline', className)}
    >
      {t('logout')}
    </button>
  )
}
