'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { checkAdmin } from '@/lib/auth/admin'
import { evaluateTrigger, type TriggerCondition } from '@/lib/oracle/trigger'
import type { Json } from '@/lib/supabase/database.types'

export interface InjectResult {
  ok: true
  trigger_met: boolean
  metric: string
  operator: string
  threshold: number
  actual_value: number
  reading_id: string
  contract_slug: string
}

export async function injectReading(
  contractId: string,
  valueJson: string,
  source: string,
): Promise<InjectResult | { ok: false; error: string }> {
  let parsedValue: Record<string, unknown>
  try {
    parsedValue = JSON.parse(valueJson)
  } catch {
    return { ok: false, error: 'Invalid JSON — check your reading value' }
  }

  // Signed in + AAL2 (TOTP MFA) + admin role: a manual reading can fire
  // payouts, so an admin password alone must not be enough.
  const admin = await checkAdmin()
  if (!admin.ok) return { ok: false, error: admin.reason }

  const supabase = createServiceClient()
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, slug, status, settled_outcome, trigger_condition')
    .eq('id', contractId)
    .single()

  if (contractError || !contract) return { ok: false, error: 'Contract not found' }

  const c = contract as {
    id: string
    slug: string
    status: string
    settled_outcome: unknown
    trigger_condition: unknown
  }

  if (c.settled_outcome !== null) {
    return { ok: false, error: 'Contract already settled' }
  }

  const condition = c.trigger_condition as TriggerCondition
  const trigger_met = condition?.metric ? evaluateTrigger(condition, parsedValue) : false
  const actual_value =
    typeof parsedValue[condition?.metric] === 'number'
      ? (parsedValue[condition.metric] as number)
      : 0

  const { data: reading, error: insertError } = await supabase
    .from('oracle_readings')
    .insert({
      contract_id: contractId,
      source,
      reading_type: 'manual',
      value: parsedValue as Json,
      trigger_met,
    })
    .select('id')
    .single()

  if (insertError || !reading) return { ok: false, error: 'Failed to write reading' }

  return {
    ok: true,
    trigger_met,
    metric: condition.metric,
    operator: condition.operator,
    threshold: condition.threshold,
    actual_value,
    reading_id: (reading as { id: string }).id,
    contract_slug: c.slug,
  }
}
