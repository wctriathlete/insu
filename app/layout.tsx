import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Instrument_Serif, Manrope } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import './globals.css'
import { SearchProvider } from '@/lib/search-context'
import Footer from '@/components/layout/Footer'
import TabBar from '@/components/layout/TabBar'
import { DEFAULT_THEME, THEME_COOKIE, isTheme } from '@/i18n/config'

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const manrope = Manrope({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')
  return { title: t('title'), description: t('description') }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F8FC' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1526' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const raw = (await cookies()).get(THEME_COOKIE)?.value
  const theme = isTheme(raw) ? raw : DEFAULT_THEME

  return (
    <html lang={locale} data-theme={theme} className={`${instrumentSerif.variable} ${manrope.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider>
          <SearchProvider>
            <div className="flex-1">{children}</div>
            <Footer />
            <TabBar />
          </SearchProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
