import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import SubmitForm from '@/components/submit/SubmitForm'
import { Eyebrow, DisplayTitle, emphasis } from '@/components/sereno/Typography'
import type { Category } from '@/lib/types'

export default async function SubmitPage() {
  const t = await getTranslations('submit')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/submit')

  const { data: categories } = await supabase.from('categories').select('*').order('display_order')

  return (
    <>
      <Header back={{ href: '/' }} hideSearch />
      <main className="mx-auto w-full max-w-[640px] px-5 pb-12 pt-6">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <DisplayTitle size="m" className="mt-2">{t.rich('title', emphasis)}</DisplayTitle>
        <p className="mt-3 text-body text-ink-secondary">{t('intro')}</p>
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <SubmitForm categories={(categories ?? []) as Category[]} />
        </div>
      </main>
    </>
  )
}
