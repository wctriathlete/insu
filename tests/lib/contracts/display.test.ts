import { describe, it, expect } from 'vitest'
import { createTranslator } from 'next-intl'
import es from '@/messages/es.json'
import en from '@/messages/en.json'
import {
  citySlugOf,
  contractEyebrow,
  contractFullName,
  contractName,
  productKind,
  routeNameOf,
  windowLabel,
} from '@/lib/contracts/display'

const tEs = createTranslator({ locale: 'es', messages: es })
const tEn = createTranslator({ locale: 'en', messages: en })

const corridor = { name: 'Periférico Sur → Centro (Mañana)', window_start: '07:00:00', window_end: '10:00:00' }
const traffic = {
  title: 'Periférico Sur → Centro — Protección Mañana',
  trigger_type: 'urban',
  location: { lat: 0, lng: 0, city: 'Mexico City', country: 'MX' },
  corridor,
}

describe('contract naming', () => {
  it('uses the untranslated route name for traffic, with the window per locale', () => {
    expect(contractName(traffic, 'es', tEs)).toBe('Periférico Sur → Centro')
    expect(contractName(traffic, 'en', tEn)).toBe('Periférico Sur → Centro')
    expect(windowLabel(corridor, tEs)).toBe('Mañanas 07:00–10:00')
    expect(windowLabel(corridor, tEn)).toBe('Mornings 07:00–10:00')
    expect(contractEyebrow(traffic, tEs)).toBe('Tráfico · CDMX')
    expect(contractEyebrow(traffic, tEn)).toBe('Commute · Mexico City')
  })

  it('prefers the route_name column over the legacy corridor name', () => {
    expect(routeNameOf({ name: 'X (Tarde)', route_name: 'Zona 10 → CES' })).toBe('Zona 10 → CES')
    expect(routeNameOf({ name: 'Zona 11 → San Lucas (Tarde)' })).toBe('Zona 11 → San Lucas')
  })

  it('names air, rain and gas from messages — never the stored question title', () => {
    const fuel = {
      title: 'Will gas exceed Q.45 per gallon in Guatemala?',
      trigger_type: 'fuel',
      location: { lat: 0, lng: 0, city: 'Guatemala City', country: 'GT' },
    }
    expect(contractName(fuel, 'es', tEs)).toBe('Gasolina cara')
    expect(contractFullName(fuel, 'es', tEs)).toBe('Gasolina cara · Ciudad de Guatemala')
    expect(contractFullName(fuel, 'en', tEn)).toBe('Gas price spike · Guatemala City')
    expect(contractName({ ...fuel, trigger_type: 'air_quality' }, 'es', tEs)).toBe('Día de mal aire')
    expect(contractName({ ...fuel, trigger_type: 'flood' }, 'en', tEn)).toBe('Heavy rain')
  })

  it('uses name_es / name_en for other products, falling back to the title', () => {
    const soon = { title: 'Cancún beaches closed?', trigger_type: 'manual', name_es: 'Sargazo en la playa', name_en: 'Sargassum beach closure' }
    expect(contractName(soon, 'es', tEs)).toBe('Sargazo en la playa')
    expect(contractName(soon, 'en', tEn)).toBe('Sargassum beach closure')
    expect(contractName({ title: 'Legacy', trigger_type: 'manual' }, 'es', tEs)).toBe('Legacy')
  })

  it('derives city slugs for the two live markets only', () => {
    expect(citySlugOf({ location: { lat: 0, lng: 0, city: 'CDMX', country: 'MX' } })).toBe('cdmx')
    expect(citySlugOf({ location: { lat: 0, lng: 0, city: 'Guatemala City', country: 'GT' } })).toBe('guatemala_city')
    expect(citySlugOf({ location: { lat: 0, lng: 0, city: 'Cancún', country: 'MX' } })).toBeNull()
    expect(citySlugOf({ city_slug: 'cdmx', location: { lat: 0, lng: 0, city: 'x', country: 'x' } })).toBe('cdmx')
  })

  it('classifies product kinds', () => {
    expect(productKind({ trigger_type: 'urban', corridor })).toBe('traffic')
    expect(productKind({ trigger_type: 'urban' })).toBe('other')
    expect(productKind({ trigger_type: 'weather' })).toBe('other')
  })
})
