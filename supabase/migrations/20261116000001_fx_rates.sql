-- supabase/migrations/20261116000001_fx_rates.sql
-- Daily official USD exchange rates for display and premium_mxn.
--
-- Charges stay in USD; these rates only convert prices for display and for the
-- MXN figure stored on coverage_tiers / hedger_positions. Filled once a day by
-- the reprice cron (lib/currency/fxFeed.ts): Banxico FIX for MXN, Banguat's
-- reference rate for GTQ. One row per currency per source date, so history is
-- kept for auditing what rate a stored MXN amount used.

CREATE TABLE IF NOT EXISTS fx_rates (
  currency   text        NOT NULL CHECK (currency IN ('MXN', 'GTQ')),
  as_of      date        NOT NULL,
  rate       numeric(12, 6) NOT NULL CHECK (rate > 0),
  source     text        NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (currency, as_of)
);

-- Public reference data: anyone may read, only the service role writes.
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fx_rates are public" ON fx_rates
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON fx_rates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON fx_rates TO service_role;
