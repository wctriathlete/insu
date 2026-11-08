'use client'

import { Search, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useSearch } from '@/lib/search-context'

export default function SearchInput() {
  const t = useTranslations('nav')
  const { query, setQuery } = useSearch()
  const router = useRouter()
  const pathname = usePathname()

  function update(value: string) {
    setQuery(value)
    // Results only render on the home page. If the search starts anywhere
    // else, send them home so matches are actually visible.
    if (value && pathname !== '/') router.push('/')
  }

  return (
    <>
      <Search size={16} className="shrink-0 text-ink-muted" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(e) => update(e.target.value)}
        aria-label={t('searchLabel')}
        placeholder={t('searchPlaceholder')}
        className="w-full min-w-0 flex-1 bg-transparent text-body-s text-ink outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          aria-label={t('clearSearch')}
          className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink"
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </>
  )
}
