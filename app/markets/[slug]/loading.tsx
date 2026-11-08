import { getTranslations } from 'next-intl/server'
import { LoadingBlocks } from '@/components/sereno/ErrorState'

export default async function Loading() {
  const t = await getTranslations('common')
  return <LoadingBlocks label={t('loading')} />
}
