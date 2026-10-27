# CLAUDE.md — insu

Insu is a parametric protection marketplace: users buy fixed-payout coverage
against real-life triggers (weather, traffic delays, cancelled events, fuel
price moves), an oracle checks the trigger, and payouts fire automatically
with no claims process. Mexico is the primary demo market; capital providers
fund the payout pool and keep premiums as yield when a trigger doesn't fire.

## Status — active

Development resumed on 2026-10-26 at Nacho's explicit go-ahead, after a hold
from 2026-07-22 to 2026-10-26. Interactive work with Nacho is in scope again
(features, fixes, recalibrations). Unattended runs are still governed by
`machine-config/devbrain-projects.{allow,excluded}`, so check there before
assuming automated jobs may touch this repo.

## Stack

- Next.js 16.2, App Router, TypeScript, React 19
- Tailwind CSS, shadcn/Base UI components
- Supabase (Postgres + RLS + SSR auth via `@supabase/ssr`)
- Stripe (PaymentIntents + webhook) for both hedger purchases and provider
  capital deposits
- Sentry (`@sentry/nextjs`) — `instrumentation.ts`, `instrumentation-client.ts`,
  and `sentry.{server,edge,client}.config.ts` are real, wired configs (server
  config strips `authorization`/`stripe-signature`/`cookie` headers before
  sending events). Confirmed real, not stubs — but disabled locally unless
  `NEXT_PUBLIC_SENTRY_DSN` is set (see `.env.local.example`); no auth token
  is configured, so source maps are not uploaded on build.
- Playwright — `playwright.config.ts` is real and points at `tests/e2e/`,
  which contains actual specs (`browse.spec.ts`, `markets.spec.ts`), driven
  against `npm run dev` on `localhost:3000`. Not a stub.
- Vitest + React Testing Library for unit/component tests (`tests/`)
- Package manager: **npm** — only `package-lock.json` is present (no
  `pnpm-lock.yaml`/`yarn.lock`/`bun.lockb`), and `package.json` has no
  `packageManager` field. Confirmed npm is on PATH (`/opt/homebrew/bin/npm`,
  v11.19.0) and used for every command below.

## Commands

All confirmed by running them directly in this repo (2026-08-18):

```bash
npm install           # node_modules was absent; install did not change package-lock.json
npm run dev            # dev server on :3000
npm run build           # next build (Turbopack) — passes cleanly, TypeScript checked
npm run lint            # eslint . — passes clean, no warnings
npm run test:run        # vitest run --passWithNoTests
npm run test:coverage   # vitest run --coverage --passWithNoTests
```

`npm run test:run` currently reports **568 passed / 2 failed** out of 570
tests, both failures in `tests/components/PriceChart.test.tsx`
(`buildChartData` assertions expecting `.Basic`/`.Metric` keys that come back
`undefined`). This is a pre-existing failure, not something your session
caused — don't spend time "fixing" it (see Status above), and don't assume a
red run on this file means you broke something.

There is no `next lint` interactive wizard risk here: `eslint.config.mjs` is
a real, populated flat config, already wired to `eslint-config-next`.

## Hard rules

- **Unattended runs follow machine-config.** See Status above: interactive
  work is active, but automated agents check
  `machine-config/devbrain-projects.{allow,excluded}` first.
- **Never deploy to production.** `vercel.json` and ONBOARDING.md both note
  deploys are manual (`vercel --prod --yes`) with GitHub auto-deploy NOT
  wired up — previews only, and only if Nacho asks for one.
- **This is a payments product handling Stripe PaymentIntents and PCI-scoped
  data** (`docs/security/pci-dss-assessment.md`, `docs/security/threat-model.md`
  exist and are real). Never log, print, or commit Stripe secrets, webhook
  signing secrets, or Supabase service-role keys.
- **The known PriceChart test failures above are pre-existing** — don't
  "fix" them as a drive-by; fix them deliberately in their own change.

## Where to learn more

- `README.md` — generic create-next-app boilerplate, not repo-specific
- `ONBOARDING.md` — the real project summary: domain concepts (contracts,
  coverage tiers, capacity model, pricing engine, oracle system), payment
  flow, database schema, application structure
- `docs/security/` — PCI DSS assessment, threat model, incident response,
  log retention
- `docs/lessons.md` — mistakes worth not repeating; twice means a hard rule
  above
