import { NextRequest, NextResponse } from 'next/server'
import { validateCronRequest } from '@/lib/auth/cronAuth'
import { repriceAll } from '@/lib/pricing/reprice'
import { refreshFxRates } from '@/lib/currency/fxFeed'
import { createServiceClient } from '@/lib/supabase/server'

async function handleReprice(req: NextRequest) {
  const authError = validateCronRequest(req)
  if (authError) return authError
  // Refresh the day's official rates first so premium_mxn uses them. Best-effort:
  // a failed feed leaves the last good rate (or the constant) in place.
  const fx = await refreshFxRates(createServiceClient())
  const count = await repriceAll()
  return NextResponse.json({
    repriced: count,
    fx: { stored: fx.stored.map(q => `${q.currency} ${q.rate} (${q.asOf})`), skipped: fx.skipped },
  })
}

// Vercel Cron sends GET; POST is kept for manual triggering
export const GET = handleReprice
export const POST = handleReprice
