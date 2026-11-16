-- supabase/migrations/20261116000002_security_hardening.sql
-- Follow-ups from the 2026-11-16 security check.

-- 1. tomtom_crosscheck was created (20260721000001) without RLS. Prod already
--    has it enabled (switched on by hand: anon sees 0 rows, service role sees
--    all), but any environment rebuilt from migrations would come up with the
--    table readable and writable by the public anon key. Record it here so the
--    committed schema matches prod. No policies: service role only, which is
--    the only writer (/api/tomtom-crosscheck) and reader (report script).
ALTER TABLE tomtom_crosscheck ENABLE ROW LEVEL SECURITY;

-- 2. profiles: the "Own profile update" policy pins `role`, but RLS is
--    row-level, so a signed-in user could still write stripe_customer_id,
--    active_days or last_seen_at on their own row straight through PostgREST
--    (payouts credit whatever stripe_customer_id is on the profile). Restrict
--    user-context UPDATE to the columns the app actually edits as the user:
--      full_name, preferred_currency, notification_prefs  (lib/actions/profile.ts)
--      preferred_locale                                   (lib/actions/preferences.ts)
--    Everything else (stripe_customer_id, active_days, last_seen_at, role,
--    conekta_customer_id) is written only by the service role or by
--    SECURITY DEFINER functions, which keep their access.
REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (full_name, preferred_currency, preferred_locale, notification_prefs)
  ON profiles TO authenticated;
