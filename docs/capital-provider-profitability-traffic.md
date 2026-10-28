# Capital Provider Profitability — Traffic (Urban Corridor) Contracts

> Handoff analysis for continuation in Claude Cowork.
> Generated 2026-07-23 from live production data (`eagmczieznsogsxldedk`).
> Scope: `trigger_type = 'urban'`, 16 live/active corridors, 32 coverage tiers.

---

## 1. What "traffic contracts" are

Traffic products are the **urban corridor** contracts (`contracts.trigger_type = 'urban'`).
16 are live+active (8 CDMX + GT AM/PM corridor pairs). Each corridor has 2 tiers:

- **Basic** — one-touch, `max_payouts = 1`
- **Pro** — capped strip, `max_payouts = 3`

Recurring tenors offered: **{1, 3, 7, 30} days** (`lib/pricing/tenors.ts`, `PERIOD_OPTIONS`).

---

## 2. The pricing model (source of the economics)

From `lib/pricing/derivative.ts`:

```
premium = payout × E[payouts] × LOADING × capacityFactor
  E[payouts] = Σ_{k=1..maxPayouts} P(N ≥ k)     N ~ Binomial(tenorDays, p)
  LOADING        = 1.15                          (the provider's edge)
  capacityFactor = 1.0 → 1.5   (1 + 0.5 × pool utilization, capped 1.5)
  MIN_PREMIUM    = $5          (floor, recurring path only)
  MAX_PREMIUM    = 70% of (payout × maxPayouts)  (cap)
  P_MIN / P_MAX  = 0.0005 / 0.95   (daily hazard clamp)
```

Key constants: `LOADING_FACTOR = 1.15`, `MIN_PREMIUM_USD = 5`, `MAX_PREMIUM_FRACTION = 0.70`.

Tenor availability gate (`tenorAvailable`): a tenor is offered iff
`LOADING × P(≥1 trigger in window) ≤ 0.70`. This is why long tenors drop off hot corridors
(30d offered on only 6/32 tiers).

### Provider economics derived from the model

- **Capital at risk** per position = `payout × maxPayouts` (worst case, fully drawn).
- **Expected loss** = `payout × E[payouts]`.
- **Expected profit / position** = `premium − E[loss] = E[loss] × (LOADING − 1)` = **15% of expected loss** (≈13% of premium) at capacityFactor 1.0, before floor/cap.
- **ROI per tenor** = profit / capital-at-risk.
- **Annualized ROI** = ROI/tenor × (365 / tenorDays)  → assumes 100% continuous redeployment.

The **$5 floor** and the **capacity surcharge (up to 1.5×)** only *add* to the 15% margin;
they never reduce it. So 15%-over-expected-loss is the conservative per-position edge.

---

## 3. Live data snapshot (2026-07-23)

- Mean daily hazard across 32 tiers: **p ≈ 0.089** (min 0.0121, median 0.0768, max 0.2470).
- Payouts (data-only history): Basic $100 × 1, Pro $100 × up to 3 (Pro lowered from $500 × 3 on 2026-07-15).

### Annualized ROI on capital-at-risk (100% redeployment assumed)

| Tenor | All tiers (fair) | with $5 floor | Basic (k=1) fair / floored | Pro (k=3) fair / floored | Tiers offered |
|------:|:---:|:---:|:---:|:---:|:---:|
| 1 day  | 325% | 442% | 487% / 663% | 162% / 221% | 32/32 |
| 3 day  | 295% | 300% | 428% / 435% | 162% / 164% | 32/32 |
| 7 day  | 191% | 191% | 271% / 271% | 112% / 112% | 24/32 |
| 30 day | 61%  | 61%  | 84% / 84%   | 38% / 38%   | 6/32  |

---

## 4. Headline conclusions

- **Per-position edge: ~15% margin over expected loss** (turnover-free, the honest number).
- **Annualized, at full utilization:** ~**60%/yr** (30-day tenor) up to **~450%+/yr** (daily tenor);
  blends to roughly **150–250%/yr** across the common short tenors.
- **The eye-popping annualized figures are turnover artifacts** — short tenors × the 100%-redeployment
  assumption. They are the *rate earned while capital is actually backing a live position*, i.e. a ceiling.
- **Realized profitability scales linearly with utilization.** Real buyer demand has been ~0 in prod,
  so deployed capital ≈ 0 → realized return ≈ idle. Multiply the table by the true utilization fraction.

---

## 5. Open items to continue in Cowork

1. **Weight by real utilization** — need `hedger_positions` / actual live buyer positions to get the
   fraction of pool deployed at any time. Table above is at util = 1.0.
2. **Weight by actual tenor/tier mix** buyers choose (not a flat average across offered tenors).
3. **Capacity surcharge upside** — model assumes capacityFactor = 1.0; a utilized pool earns up to 1.5×,
   raising the margin above 15%.
4. **Floor contribution** — quantify how much of realized margin comes from the $5 floor vs the 1.15 loading
   (material at 1-day, negligible at 7d+).
5. **Payout risk / variance** — table is expected value only; add the distribution (ruin probability,
   capital adequacy) for a real provider-return model.
6. **GT vs CDMX split** — hazards differ by market; consider reporting the two books separately.

---

## 6. Reproduction script

Run from the **repo root** (needs `node_modules` + `.env.local` with `SUPABASE_SERVICE_ROLE_KEY`).
Read-only. Same pricing math as `lib/pricing/derivative.ts`.

```js
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = Object.fromEntries(
  readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#'))
    .map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).replace(/^"|"$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const LOADING=1.15, FLOOR=5, CAPFRAC=0.70;
function pk(T,p,k){ if(k<=0)return 1; if(T<=0||p<=0)return 0; if(p>=1)return 1; if(k>T)return 0;
  let term=Math.pow(1-p,T),cdf=term; for(let j=1;j<k;j++){term=(term*(T-j+1)/j)*(p/(1-p));cdf+=term;}
  return Math.max(0,Math.min(1,1-cdf)); }
const PERIODS=[1,3,7,30];
const { data: contracts } = await sb.from('contracts').select('id, slug, trigger_type, launch_stage, status');
const urban=contracts.filter(c=>c.trigger_type==='urban'&&c.launch_stage==='live'&&c.status==='active');
const ids=new Set(urban.map(c=>c.id));
const { data: tiers } = await sb.from('coverage_tiers').select('contract_id, name, payout_usd, base_probability, max_payouts');
const tt=tiers.filter(t=>ids.has(t.contract_id));
function line(label, rows){
  const mFair=rows.reduce((s,r)=>s+r.roiFair,0)/rows.length;
  const mReal=rows.reduce((s,r)=>s+r.roiReal,0)/rows.length;
  console.log(`  ${label.padEnd(26)} fair: ${(mFair*100).toFixed(0).padStart(4)}%/yr   floored: ${(mReal*100).toFixed(0).padStart(4)}%/yr`);
}
for (const T of PERIODS){
  const rows=[];
  for (const t of tt){
    const p=t.base_probability, payout=t.payout_usd, k=t.max_payouts||1;
    if (LOADING*pk(T,p,1) > CAPFRAC+1e-9) continue;               // availability gate
    let E=0; for(let i=1;i<=k;i++) E+=pk(T,p,i);
    const eLoss=payout*E, capital=payout*k;
    const premFair=eLoss*LOADING;
    const premReal=Math.min(Math.max(FLOOR,premFair), payout*k*CAPFRAC);
    rows.push({tier:k===1?'Basic':'Pro',
      roiFair:(premFair-eLoss)/capital*365/T, roiReal:(premReal-eLoss)/capital*365/T});
  }
  console.log(`\nTenor ${T}d  (offered on ${rows.length}/${tt.length} tiers)`);
  line('ALL tiers', rows);
  line('Basic (one-touch, k=1)', rows.filter(r=>r.tier==='Basic'));
  line('Pro (3-touch, k=3)', rows.filter(r=>r.tier==='Pro'));
}
```

**Assumptions baked in:** capacityFactor = 1.0 (empty pool), 100% redeployment, expected-value only
(no variance/ruin), flat average across offered tenors. Adjust these for the real provider-return model.
