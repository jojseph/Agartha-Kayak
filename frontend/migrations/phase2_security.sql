-- ============================================================
-- AGARTHA — Phase 2 Migration: Security & Auth
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- Date: 2026-05-15
-- Owner: Module 1 (kuzu.md)
-- ============================================================
-- This migration adds:
--   1. auth_nonces table — single-use, time-limited nonces for wallet-signed requests
--   2. adjust_treasury_balance(uuid, numeric) — atomic balance adjustment RPC
--      (consumed by CP2's balanceOps.ts wrapper)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. AUTH_NONCES — single-use nonces for the WalletSig auth scheme
-- See: frontend/docs/AUTH_CONTRACT.md
-- ============================================================

CREATE TABLE IF NOT EXISTS public.auth_nonces (
  nonce text PRIMARY KEY,
  wallet_address text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz NULL
);

-- Lookup by issued_at for expiry sweeps; nonce PK already covers lookup by nonce.
CREATE INDEX IF NOT EXISTS idx_auth_nonces_issued_at
  ON public.auth_nonces (issued_at);

-- Optional housekeeping helper — drop expired-and-used nonces older than 1 day.
-- Not scheduled by default; an Owner can run this manually or wire a pg_cron job later.
CREATE OR REPLACE FUNCTION public.purge_old_auth_nonces() RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.auth_nonces
    WHERE issued_at < now() - interval '1 day';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


-- ============================================================
-- 2. ADJUST_TREASURY_BALANCE — atomic +/- on a community's treasury
-- Replaces the read-then-write pattern that had a race condition:
--   - api/members/approve/route.ts (share capital credit)
--   - api/treasury/reconciliation/sign/route.ts (manual update)
--   - api/loans/repayment/confirm/route.ts (loan repayment credit)
-- ============================================================

CREATE OR REPLACE FUNCTION public.adjust_treasury_balance(
  p_community_id uuid,
  p_delta numeric
) RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.communities
    SET treasury_balance = COALESCE(treasury_balance, 0) + p_delta
    WHERE community_id = p_community_id
    RETURNING treasury_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Community % not found', p_community_id
      USING ERRCODE = 'no_data_found';
  END IF;

  RETURN new_balance;
END;
$$;

COMMIT;

-- ============================================================
-- DONE — Phase 2 Security migration complete
-- Verify:
--   SELECT to_regclass('public.auth_nonces');         -- expect: public.auth_nonces
--   SELECT public.adjust_treasury_balance(<uuid>, 0); -- expect: current balance, no change
-- ============================================================
