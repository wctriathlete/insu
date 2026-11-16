'use client'

import { createContext, useContext } from 'react'
import { FX_RATES } from '@/lib/currency/config'
import type { FxRates } from '@/lib/currency/rates'

const FxRatesContext = createContext<FxRates>(FX_RATES)

/** Supplies the day's official rates (loaded in the root layout) to client components. */
export function FxRatesProvider({ rates, children }: { rates: FxRates; children: React.ReactNode }) {
  return <FxRatesContext.Provider value={rates}>{children}</FxRatesContext.Provider>
}

export function useFxRates(): FxRates {
  return useContext(FxRatesContext)
}
