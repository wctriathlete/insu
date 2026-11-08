import { describe, it, expect } from 'vitest'
import { formatDayRange, formatTime, money, referencePrice } from '@/lib/format'
import { formatMoney } from '@/lib/utils'

describe('Sereno formatting', () => {
  it('formats money compactly with an unambiguous peso symbol', () => {
    expect(formatMoney(5)).toBe('$5')
    expect(formatMoney(1700, 'MXN')).toBe('MX$1,700')
    expect(formatMoney(38.75, 'GTQ')).toBe('Q39')
    expect(money(11, 'MXN')).toBe('MX$187')
  })

  it('formats day ranges per locale in market time', () => {
    expect(formatDayRange('2026-11-09', '2026-11-15', 'es')).toMatch(/9.*15 de noviembre/)
    expect(formatDayRange('2026-11-09', '2026-11-09', 'es')).toBe('9 de noviembre')
    expect(formatDayRange('2026-11-09', '2026-11-15', 'en')).toMatch(/Nov(ember)? 9.*15/)
  })

  it('formats times in market time, 24h', () => {
    expect(formatTime('2026-11-07T15:30:00Z', 'es')).toBe('09:30')
  })

  it('formats reference prices in their own market currency', () => {
    expect(referencePrice(23.4, 'mx')).toBe('MX$23.40')
    expect(referencePrice(31.69, 'gt')).toBe('Q31.69')
  })
})
