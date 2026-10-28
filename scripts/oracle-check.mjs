// Read-only daily health check: oracle readings, triggers/payouts, tier pricing, reprice history.
// Run from the repo root: node scripts/oracle-check.mjs (reads .env.local, service-role key).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')])
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const now = Date.now();
const since24h = new Date(now - 24*3600e3).toISOString();

const { data: contracts, error: ec } = await sb.from('contracts')
  .select('id, slug, title, status, launch_stage, trigger_type');
if (ec) { console.error('contracts error:', ec.message); process.exit(1); }
const cById = Object.fromEntries(contracts.map(c => [c.id, c]));
const live = contracts.filter(c => c.launch_stage === 'live' && c.status === 'active');

// 1) oracle readings last 24h
const { data: readings, error: e1 } = await sb
  .from('oracle_readings').select('contract_id, source, reading_type, trigger_met, read_at')
  .gte('read_at', since24h).order('read_at', { ascending: false }).limit(5000);
if (e1) console.error('readings error:', e1.message);
console.log('=== ORACLE READINGS last 24h ===  total:', readings?.length, ' now:', new Date(now).toISOString());
const byContract = {};
for (const r of readings || []) (byContract[r.contract_id] ||= []).push(r);
const rows = Object.entries(byContract).map(([cid, arr]) => {
  const c = cById[cid] || {};
  const ageMin = Math.round((now - Date.parse(arr[0].read_at))/60000);
  return { slug: c.slug || cid.slice(0,8), src: arr[0].source, type: arr[0].reading_type,
           n: arr.length, ageMin, triggers: arr.filter(r => r.trigger_met).length };
}).sort((a,b) => (a.src+a.slug).localeCompare(b.src+b.slug));
for (const r of rows) console.log(`${String(r.src).padEnd(15)} ${r.slug.padEnd(42)} ${String(r.type).padEnd(14)} n=${String(r.n).padStart(3)} age=${String(r.ageMin).padStart(4)}m trig=${r.triggers}`);

const noReads = live.filter(c => !byContract[c.id] && c.trigger_type !== 'manual' && c.trigger_type !== 'event');
console.log(`\nlive+active contracts: ${live.length}; oracle-fed ones with NO readings 24h:`, noReads.length ? noReads.map(c => `${c.slug}[${c.trigger_type}]`).join(', ') : 'none');

// 2) triggers + payouts
const trig = (readings||[]).filter(r => r.trigger_met);
console.log('\n=== TRIGGERS last 24h ===', trig.length);
for (const t of trig.slice(0,20)) console.log(`${(cById[t.contract_id]||{}).slug}  ${t.read_at}`);
const { data: payouts, error: e3 } = await sb.from('payouts').select('*').gte('created_at', since24h);
console.log('=== PAYOUTS last 24h ===', e3 ? e3.message : payouts.length);
for (const p of payouts || []) console.log(`${(cById[p.contract_id]||{}).slug} $${p.amount_usd} ${p.status} ${p.created_at}`);

// 3) pricing state per live contract tier
const { data: tiers, error: et } = await sb.from('coverage_tiers')
  .select('contract_id, name, premium_usd, payout_usd, base_probability, last_priced_at, pricing_inputs');
if (et) console.error('tiers error:', et.message);
console.log('\n=== COVERAGE TIERS (live contracts) ===');
const liveIds = new Set(live.map(c => c.id));
const staleRepriceh = [];
for (const t of (tiers||[]).filter(t => liveIds.has(t.contract_id)).sort((a,b)=>((cById[a.contract_id].slug+a.name).localeCompare(cById[b.contract_id].slug+b.name)))) {
  const c = cById[t.contract_id];
  const ageH = t.last_priced_at ? ((now - Date.parse(t.last_priced_at))/3600e3).toFixed(1) : 'never';
  const mult = t.pricing_inputs?.oracle_multiplier ?? t.pricing_inputs?.oracleMultiplier ?? '-';
  console.log(`${c.slug.padEnd(42)} ${t.name.padEnd(8)} prem=$${String(t.premium_usd).padEnd(8)} payout=$${String(t.payout_usd).padEnd(6)} p=${String(t.base_probability).padEnd(7)} mult=${String(mult).padEnd(6)} priced_${ageH}h_ago`);
  if (ageH !== 'never' && +ageH > 26) staleRepriceh.push(`${c.slug}/${t.name}=${ageH}h`);
}
console.log('\ntiers priced >26h ago:', staleRepriceh.length ? staleRepriceh.join(', ') : 'none');

// 4) pricing_history last 48h
const { data: ph, error: e5 } = await sb.from('pricing_history')
  .select('contract_id, premium_usd_before, premium_usd_after, calculated_at')
  .gte('calculated_at', new Date(now - 48*3600e3).toISOString())
  .order('calculated_at', { ascending: false }).limit(1000);
if (e5) console.error('pricing_history error:', e5.message);
else {
  console.log('\n=== PRICING_HISTORY last 48h ===', ph.length, 'rows');
  const byHour = {};
  for (const p of ph) (byHour[p.calculated_at.slice(0,13)] ||= []).push(p);
  for (const [h, arr] of Object.entries(byHour).sort()) {
    const changed = arr.filter(p => +p.premium_usd_before !== +p.premium_usd_after).length;
    console.log(`${h}:00Z  n=${arr.length} changed=${changed}`);
  }
}
