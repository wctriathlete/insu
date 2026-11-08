// tests/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats USD amounts with an explicit currency code', () => {
    expect(formatCurrency(500, 'USD')).toBe('$500 USD')
    expect(formatCurrency(1700, 'USD')).toBe('$1,700 USD')
  })

  it('formats MXN amounts with an explicit currency code', () => {
    expect(formatCurrency(9500, 'MXN')).toContain('9,500')
    expect(formatCurrency(9500, 'MXN')).toContain('MXN')
  })

  it('formats GTQ with the quetzal narrow symbol, not a redundant code', () => {
    const out = formatCurrency(780, 'GTQ')
    expect(out).toContain('Q780')
    expect(out.endsWith('GTQ')).toBe(true)
    expect(out).not.toContain('GTQ 780')
  })

  it('formats MXN with the narrow symbol and disambiguating ISO code', () => {
    expect(formatCurrency(1700, 'MXN')).toBe('$1,700 MXN')
  })
})
