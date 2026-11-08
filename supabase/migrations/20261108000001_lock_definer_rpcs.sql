-- supabase/migrations/20261108000001_lock_definer_rpcs.sql
-- SECURITY FIX: SECURITY DEFINER functions were callable by anyone.
--
-- Postgres grants EXECUTE on new functions to PUBLIC, and no migration ever
-- revoked it, so PostgREST exposed these at /rest/v1/rpc/* to the public anon
-- key with no sign-in (confirmed in prod 2026-11-08 with a no-op call). Since
-- they bypass RLS, anyone could:
--   * increment_tier_capacity   — fake or drain pool capital on any tier
--   * increment_contract_volume — inflate a contract's volume
--   * touch_last_seen(uuid)     — stamp activity on any user's profile
--
-- The two counters are only ever called with the service role (webhook,
-- activation action), so lock them to service_role. The heartbeat is called by
-- proxy.ts with the signed-in user's own client, so it becomes a no-argument
-- function that only ever touches auth.uid().

-- 1. Pool/volume counters: service role only.
REVOKE EXECUTE ON FUNCTION increment_tier_capacity(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_contract_volume(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_tier_capacity(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION increment_contract_volume(uuid, numeric) TO service_role;

-- 2. Heartbeat: replace the caller-supplied user id with auth.uid().
--    The old signature is dropped; until the matching proxy.ts deploys, its
--    best-effort call fails and is swallowed (heartbeat pauses, nothing breaks).
DROP FUNCTION IF EXISTS touch_last_seen(uuid);

CREATE OR REPLACE FUNCTION touch_last_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE profiles
  SET active_days = active_days + CASE
        WHEN last_seen_at IS NULL OR last_seen_at < date_trunc('day', now()) THEN 1
        ELSE 0
      END,
      last_seen_at = now()
  WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION touch_last_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION touch_last_seen() TO authenticated, service_role;

-- 3. Future functions in public start closed: each one must GRANT what it
--    needs explicitly instead of inheriting PUBLIC/anon/authenticated EXECUTE.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
