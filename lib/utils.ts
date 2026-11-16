// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import type { Currency } from './types'

// Teach tailwind-merge the Sereno type scale and radii. Without this it reads
// `text-caption` as a text *color* and silently drops it when merged with
// `text-ink-muted` (and vice versa).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-xl', 'display-l', 'display-m', 'display-s', 'amount-xl', 'amount',
            'title', 'body', 'body-s', 'label', 'button', 'caption', 'eyebrow',
          ],
        },
      ],
      rounded: [{ rounded: ['badge', 'm', 'card'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Compact money for Sereno surfaces: "US$5", "MX$85", "Q39". In Mexico a bare
 * "$" reads as pesos, and many surfaces (cards, dashboard, Respaldar) carry no
 * "charged in USD" caption, so dollars are always marked "US$".
 */
export function formatMoney(amount: number, currency: Currency = 'USD'): string {
  const rounded = Math.round(amount)
  const digits = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.abs(rounded))
  const sign = rounded < 0 ? '−' : ''
  const symbol = currency === 'MXN' ? 'MX$' : currency === 'GTQ' ? 'Q' : 'US$'
  return `${sign}${symbol}${digits}`
}

export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
  // Some ICU builds insert a space between the symbol and digits (e.g. "Q 780"),
  // and it may be a normal space (U+0020) or a non-breaking space (U+00A0).
  // Match both explicitly so the output is consistently "Q780" on any ICU build.
  const compact = formatted.replace(/([^\d,.\s])[ \u00a0](\d)/g, '$1$2')
  // Append the ISO code so the currency is unambiguous (e.g. "$1,234 USD"),
  // important in MX where a bare "$" can read as pesos.
  return `${compact} ${currency}`
}
