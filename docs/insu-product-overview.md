# Insu — Product Overview

*Deck-ready product & feature description. Snapshot: 2026-07-18. Live production app: insu-theta.vercel.app.*

---

## 1. One-liner

**Insu is a parametric event-protection marketplace: buy a contract that pays out automatically the moment a measurable, real-world trigger fires — no claims, no adjusters, no paperwork.**

Instead of filing a claim and waiting weeks for an adjuster, a user buys protection against a specific, measurable event (a bad-traffic commute, a bad-air day, a flash flood, a fuel-price spike). An automated oracle watches live data. When the trigger condition is met, the payout is released in minutes.

---

## 2. The problem

Traditional insurance is the wrong tool for high-frequency, everyday disruptions:

- **Slow:** claims take weeks to months to settle.
- **Disputed:** adjusters interpret fine print differently on every case.
- **Proof-of-loss burden:** receipts, forms, documentation — friction that exceeds the value of the loss.
- **Uninsurable long tail:** "I couldn't get to work because of traffic," "the air was too polluted to run my delivery route," "gas spiked and killed my margin" — real economic hits that no one insures.

The result: people and small businesses absorb a steady drip of disruption costs with no instrument to offset them.

## 3. The solution — parametric, oracle-driven, instant

Insu replaces the claim with a **binary trigger** and a **fixed payout**:

- **Fixed price, known upfront.** You see exactly what you pay and exactly what you get.
- **Objective trigger.** A defined, measurable condition (e.g. IMECA ≥ 150; rainfall ≥ 30 mm/h; commute time above baseline). It either fires or it doesn't.
- **Payout in minutes, not months.** No claim forms, no receipts, no human discretion.
- **Data, not disputes.** Because triggers are parametric, there is nothing to argue about.

> Positioning line (from the live product): *"Protection that pays the moment it happens."*

---

## 4. How it works (4 steps)

1. **Choose your protection.** Browse a marketplace of contracts, each with a defined trigger condition and a fixed payout. Pick a **Basic** or **Pro** tier and a coverage period.
2. **Pay a fixed price.** Pay instantly by card (Stripe). The position locks before the trigger deadline. What buyers pay funds the liquidity pool that backs payouts.
3. **The oracle monitors the trigger.** An automated oracle layer polls live data sources continuously — no manual input, no human discretion.
4. **Trigger fires → payout in minutes.** When the condition is met, the payout is released automatically to the holder.

---

## 5. Two-sided marketplace

Insu is a **two-sided market** with algorithmic pricing connecting the two.

**Hedgers (buyers of protection)**
- Pay a fixed price upfront, receive a fixed payment if the trigger fires.
- No loss documentation — just fast help offsetting the cost of disruption.
- Examples: commuters, gig/delivery workers, small businesses, event vendors, runners.

**Capital providers (liquidity)**
- Deposit into a liquidity pool that backs other users' protection.
- Earn fee income when triggers don't fire.
- Risk is **bounded, transparent, and diversified** across many contracts, with parameters known before deposit.
- Expected fee income is priced algorithmically at each repricing cycle; capital is withdrawable after a contract settles.

---

## 6. What's live today (product surface)

A fully working consumer web app in production, not a prototype:

| Feature | Description |
|---|---|
| **Marketplace / browse** | Discover contracts by region and category, with trending and "coming soon" sections and live search. |
| **Contract detail + purchase flow** | Trigger conditions, live oracle readings, coverage-period selection, tier comparison, and a card-based purchase panel. |
| **Coverage tiers (Basic / Pro)** | Basic pays once; Pro pays up to 3 times per event. Prices are live and parametric. |
| **Instant parametric payouts** | Automated payout processing the moment a trigger fires — reads the authoritative live payout value. |
| **Dashboard** | Track active protections, provider capital positions, and payouts. |
| **In-app notifications + profile** | Real-time alerts (protection triggered/paid, expired, purchased, launch of watched products) and a user profile. |
| **Multi-currency display (NEW, 2026-07-18)** | View prices in USD or the contract's local currency — **quetzales (Q)** for Guatemala, **pesos (MXN)** for Mexico — via a profile preference. Display-only; charge settles in USD. |
| **Coverage dates & confirmation** | Clear coverage windows and confirmation numbers on purchase. |
| **"Notify me" for coming-soon** | Users register interest; get fan-out notifications when a watched product launches. |
| **Admin console** | Contract management, oracle monitoring, manual triggers, payouts, scenario testing, and per-tester activity/engagement tracking. |

---

## 7. Live protection categories & markets

**19 live contracts** across four categories, in **two countries** today (Mexico City + Guatemala City), with a deep pipeline.

### Urban mobility — traffic corridors (16 live)
Commute-time protection on named road corridors, split into **AM / PM commute pairs**. The oracle measures live travel time vs. a calibrated baseline; the trigger fires on abnormal delay within the commute window.
- **Mexico City (12):** Reforma, Periférico Norte/Sur, Viaducto, Bicentenario, Palmas, and more.
- **Guatemala City (4):** Carretera a El Salvador ↔ Zona 10; Zona 11 ↔ San Lucas.

### Air quality (1 live)
- **CDMX — bad-air day:** pays when the air-quality index reaches contingency levels (IMECA ≥ 150).

### Urban flooding (1 live)
- **CDMX — heavy-rain flooding:** pays on intense rainfall (≥ 30 mm/h).

### Fuel-price spikes (1 live)
- **CDMX — Magna gas price spike:** pays when regular-gasoline prices breach a threshold.

### Pipeline (10 coming soon)
Weather (Cabo heatwave, Amazon/Manaus flooding, Cancún hurricane landfall, Whistler snowfall, Guadalajara flash flood), an urban transit-shutdown contract (São Paulo metro), and event/utility products (Bogotá water shortage, Buenos Aires blackout, Guatemala fuel). Pipeline geographies span **Colombia, Argentina, Brazil, Canada, and Chile** — evidence of a repeatable, expandable playbook.

---

## 8. Geographic footprint

- **Live:** Mexico (CDMX) and Guatemala (Guatemala City).
- **Localized for Guatemala:** quetzal pricing display and Guatemala-specific traffic corridors — showing the model ports cleanly to a new country.
- **Pipeline:** Mexico (Cabo, Cancún, Guadalajara), plus Colombia, Argentina, Brazil, Canada, Chile.

---

## 9. The pricing & risk engine

Insu's differentiator is a **real parametric pricing engine**, not hand-set prices:

- **Parametric, oracle-driven pricing.** Premiums are computed from trigger probability × payout × loading × capacity, and re-derived automatically on a schedule.
- **Credibility-weighted calibration.** Trigger probabilities are calibrated from accumulating oracle history using a credibility-weighted (Beta-Binomial) blend of model and observed frequencies — prices move from placeholder assumptions toward data-derived values as evidence accrues.
- **Oracle-reactive multipliers.** Live conditions nudge prices up when risk is elevated (e.g. rain approaching a flood threshold raises that contract's price).
- **Recurring vs one-time products.** Two pricing paths: recurring corridor/period products vs one-time event contracts, each with appropriate premium caps and floors (e.g. a minimum price floor and tenor-availability rules that keep short-window products sensible).
- **Automated repricing.** The full book reprices on an automated daily cycle (00:00 UTC).

## 10. Oracle infrastructure

- **Live data sources:** Google Maps (traffic/travel time), OpenWeatherMap (air quality + rainfall/flood), Tomorrow.io (weather), and CRE (Mexican fuel prices).
- **Automated pipeline.** Urban corridors read every ~15 minutes within their commute windows; air-quality and flood read hourly; weather and fuel on their own cadences — all on scheduled cron jobs, punctual and hands-off.
- **No human discretion** between the data and the payout.

---

## 11. Why it's trustworthy (and regulator-aware)

- **Binary triggers remove disputes** — the core trust argument vs. traditional claims.
- **Transparent risk for capital providers** — bounded, known parameters, diversified book.
- **Deliberate, regulator-aware language.** The consumer product intentionally uses *protection / price / fees* rather than insurance vocabulary, with a plain-language disclaimer and terms — a conscious posture for the Mexican regulatory environment (CNSF).

---

## 12. Recent momentum (what shipped lately)

A snapshot of velocity — all in production:

- **Multi-currency display** (USD + contract-local Q/MXN) — shipped 2026-07-18.
- **Guatemala market launch** — corridors + quetzal localization, proving cross-country expansion.
- **Air-quality and urban-flood products** — new parametric categories live.
- **Fuel-price protection** — live oracle reading Mexican CRE feeds.
- **Credibility-weighted trigger calibration** — pricing now data-driven off real oracle history.
- **Pricing corrections** — fixed a multiplier floor that mispriced recurring products; added a minimum-price floor and tenor-availability rules.
- **Product accessibility** — lowered payouts/prices (e.g. Pro tiers restructured to be ~5× cheaper) to drive adoption.
- **Admin activity monitoring** — per-tester engagement via a last-seen heartbeat.
- **Oracle pipeline hardening** — migrated to a punctual 15-minute cron pipeline; fail-safe heartbeats.
- **Notifications, profiles, coverage dates, purchase confirmations, terms/disclaimer** — the consumer-grade polish layer.

---

## 13. Tech stack

- **Frontend/app:** Next.js (App Router), TypeScript, Tailwind, deployed on Vercel.
- **Data/auth:** Supabase (Postgres + auth, with admin TOTP MFA).
- **Payments:** Stripe (settlement in USD).
- **Oracles:** Google Maps, OpenWeatherMap, Tomorrow.io, CRE — via scheduled cron jobs.
- **Quality:** ~516 automated tests; typed end-to-end.

---

## 14. Suggested slide structure (for Cowork)

1. **Title / one-liner** — parametric event-protection marketplace.
2. **Problem** — insurance is slow, disputed, paperwork-heavy; the everyday-disruption long tail is uninsured.
3. **Solution** — binary trigger + fixed payout + oracle = pays in minutes.
4. **How it works** — the 4 steps (with the oracle in the middle).
5. **Two-sided marketplace** — hedgers ↔ capital providers, algorithmic pricing.
6. **What's live** — 19 contracts, 4 categories, 2 countries; screenshots of browse + purchase + dashboard.
7. **Categories & markets** — traffic corridors, air quality, flooding, fuel; the map.
8. **Pricing & oracle engine** — the technical moat (calibration + automation).
9. **Traction / momentum** — the "recent shipped" list; roadmap pipeline (10 coming soon, 5 new countries).
10. **Why now / defensibility** — data flywheel (calibration improves with history), regulator-aware design, repeatable country playbook.
11. **Team / ask.**

---

## ⚠️ Copy to reconcile before the deck ships

- **Minimum price:** current live floor is **$5 USD/event** (post the min-premium-floor change). The old site/deck line "Protection from $18 USD/event" is outdated — use **$5** or a current representative range.
- **Repricing cadence:** repricing runs **daily (00:00 UTC)** in production; the current site copy says "every 6 hours." Use "daily automated repricing" unless/until a 6-hour cron is actually in place.
- **Metrics to fill with real data:** "< 10 min average payout time" and "4 oracle data sources" appear in the live product — confirm current numbers (data sources = 4: Google Maps, OpenWeatherMap, Tomorrow.io, CRE).
- **Oracle cadence (changed after this snapshot):** urban corridors now read every **~30 minutes** (halved from 15 on 2026-08-01 to cut Google Routes cost) — update §10 and §12 before reusing.
- **Fuel (changed after this snapshot):** Guatemala fuel (regular, Q45 strike) is now **live** on the AGN/MEM oracle (2026-07-23; parser fixed 2026-10-26), so fuel is 2 live contracts, not 1.
- **Test count:** ~570 automated tests as of 2026-10, not ~516.
- **Volume/traction numbers:** the app currently runs with friends-and-family testers and minimal live positions — keep any traction claims honest (pipeline breadth and shipped feature velocity are the stronger story right now).
