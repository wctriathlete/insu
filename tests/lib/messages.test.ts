import { describe, it, expect } from 'vitest'
import es from '@/messages/es.json'
import en from '@/messages/en.json'

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix]
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}

// CNSF word list (handoff §8.1): never insurance vocabulary in product copy.
// The not-an-insurer disclaimer is the one sanctioned exception.
const BANNED_ES = /\b(seguros?|asegurad[oa]s?|asegurar|prima|indemnizaci[oó]n|reclamos?|siniestros?|p[oó]liza|cobertura|portafolio|posiciones)\b/i
const BANNED_EN = /\b(insurance|insured|premium|policy|policies|coverage|claims?)\b/i
const DISCLAIMER = new Set(['footer.notInsurer', 'footer.disclaimer', 'auth.terms', 'auth.signupBody'])

function entries(obj: unknown, prefix = ''): [string, string][] {
  if (typeof obj === 'string') return [[prefix, obj]]
  if (typeof obj !== 'object' || obj === null) return []
  return Object.entries(obj).flatMap(([k, v]) => entries(v, prefix ? `${prefix}.${k}` : k))
}

describe('message catalogs', () => {
  it('es and en have exactly the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(es).sort())
  })

  it('never use insurance vocabulary outside the disclaimer', () => {
    const hits = [
      ...entries(es).filter(([k, v]) => !DISCLAIMER.has(k) && BANNED_ES.test(v)),
      ...entries(en).filter(([k, v]) => !DISCLAIMER.has(k) && BANNED_EN.test(v)),
    ]
    expect(hits).toEqual([])
  })

  it('has no exclamation marks (handoff §8.2 voice)', () => {
    expect([...entries(es), ...entries(en)].filter(([, v]) => /[!¡]/.test(v))).toEqual([])
  })
})
