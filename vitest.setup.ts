import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('next/link', () => {
  return {
    default: ({ href, children, ...props }: { href: string; children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('a', { href, ...props }, children),
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// next-intl: render with the real Spanish catalog (the default locale) so tests
// exercise actual copy and ICU formatting, without a provider per test.
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>()
  const messages = (await import('./messages/es.json')).default
  const make = (namespace?: string) =>
    actual.createTranslator({ locale: 'es', messages, namespace: namespace as never })
  return {
    ...actual,
    useTranslations: (namespace?: string) => make(namespace),
    useLocale: () => 'es',
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl')
  const messages = (await import('./messages/es.json')).default
  return {
    getTranslations: async (arg?: string | { namespace?: string }) => {
      const namespace = typeof arg === 'string' ? arg : arg?.namespace
      return createTranslator({ locale: 'es', messages, namespace: namespace as never })
    },
    getLocale: async () => 'es',
    getMessages: async () => messages,
  }
})
