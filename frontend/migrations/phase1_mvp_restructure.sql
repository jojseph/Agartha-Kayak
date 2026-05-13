-- ============================================================
-- AGARTHA MVP — Phase 1 Migration Script
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- Date: 2026-05-12
-- ============================================================
-- This script uses ALTER TABLE to modify existing tables in-place.
-- It will NOT drop or recreate tables, so existing data is preserved.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. MEMBERS TABLE — Add 'owner' and 'superuser' roles + KYC field
-- ============================================================

-- Drop the old role constraint and replace with expanded version
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_role_check;

ALTER TABLE public.members
  ADD CONSTRAINT members_role_check
  CHECK (role = ANY (ARRAY['member'::text, 'elder'::text, 'owner'::text, 'superuser'::text]));

-- Add government ID URL for KYC verification
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS id_document_url text;


-- ============================================================
-- 2. COMMUNITIES TABLE — Add owner reference + share capital config
-- ============================================================

-- Track which wallet address is the COOP Owner
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS owner_address text;

-- The initial funds the Owner declared at COOP formation
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS initial_funds numeric DEFAULT 0;

-- Minimum share capital new members must contribute to join
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS share_capital_required numeric DEFAULT 500;

-- Add FK constraint (owner must be a registered member)
-- NOTE: Using DO block so it won't fail if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'communities_owner_address_fkey'
  ) THEN
    ALTER TABLE public.communities
      ADD CONSTRAINT communities_owner_address_fkey
      FOREIGN KEY (owner_address) REFERENCES public.members(wallet_address);
  END IF;
END $$;


-- ============================================================
-- 3. LOANS TABLE — Add collateral, interest rate, new statuses
-- ============================================================

-- Collateral declaration (e.g. "Samsung Galaxy S24", "Honda Click 125i")
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS collateral text;

-- Interest rate — defaults to 1% (0.01), capped at 5%
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS interest_rate numeric DEFAULT 0.01;

-- Add check constraint for interest rate bounds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'loans_interest_rate_check'
  ) THEN
    ALTER TABLE public.loans
      ADD CONSTRAINT loans_interest_rate_check
      CHECK (interest_rate >= 0 AND interest_rate <= 0.05);
  END IF;
END $$;

-- Drop old status constraint and add expanded version
-- (adds: fully_paid, overdue, invalid)
ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_status_check;

ALTER TABLE public.loans
  ADD CONSTRAINT loans_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'approved'::text,
    'active'::text,
    'rejected'::text,
    'completed'::text,
    'fully_paid'::text,
    'overdue'::text,
    'defaulted'::text,
    'invalid'::text
  ]));


-- ============================================================
-- 4. REPAYMENTS TABLE — Add two-step witness fields
-- ============================================================

-- Status: pending (member logged it) → confirmed (Elder verified)
ALTER TABLE public.repayments
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'repayments_status_check'
  ) THEN
    ALTER TABLE public.repayments
      ADD CONSTRAINT repayments_status_check
      CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text]));
  END IF;
END $$;

-- Who confirmed the payment in real life
ALTER TABLE public.repayments
  ADD COLUMN IF NOT EXISTS confirmed_by text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'repayments_confirmed_by_fkey'
  ) THEN
    ALTER TABLE public.repayments
      ADD CONSTRAINT repayments_confirmed_by_fkey
      FOREIGN KEY (confirmed_by) REFERENCES public.members(wallet_address);
  END IF;
END $$;

-- When was the payment confirmed
ALTER TABLE public.repayments
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;


-- ============================================================
-- 5. COMMUNITY TRANSACTIONS — Expand types + add tracking fields
-- ============================================================

-- Drop old constraint and expand transaction types
ALTER TABLE public.community_transactions
  DROP CONSTRAINT IF EXISTS community_transactions_transaction_type_check;

ALTER TABLE public.community_transactions
  ADD CONSTRAINT community_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY[
    'loan'::text,
    'repayment'::text,
    'share_capital'::text,
    'deposit'::text,
    'reconciliation'::text
  ]));

-- Track which member initiated the transaction
ALTER TABLE public.community_transactions
  ADD COLUMN IF NOT EXISTS member_address text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'community_transactions_member_address_fkey'
  ) THEN
    ALTER TABLE public.community_transactions
      ADD CONSTRAINT community_transactions_member_address_fkey
      FOREIGN KEY (member_address) REFERENCES public.members(wallet_address);
  END IF;
END $$;

-- Amount of the transaction
ALTER TABLE public.community_transactions
  ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;

-- Human-readable description
ALTER TABLE public.community_transactions
  ADD COLUMN IF NOT EXISTS description text;


-- ============================================================
-- 6. NEW TABLE — Treasury Reconciliations (multi-sig balance updates)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.treasury_reconciliations (
  reconciliation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  proposed_by text NOT NULL,
  previous_balance numeric NOT NULL,
  proposed_balance numeric NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  sigs_required integer DEFAULT 2 CHECK (sigs_required >= 1),
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT treasury_reconciliations_pkey PRIMARY KEY (reconciliation_id),
  CONSTRAINT treasury_reconciliations_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(community_id),
  CONSTRAINT treasury_reconciliations_proposed_by_fkey FOREIGN KEY (proposed_by) REFERENCES public.members(wallet_address)
);


-- ============================================================
-- 7. NEW TABLE — Reconciliation Signatures (Elder sign-offs)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reconciliation_signatures (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  reconciliation_id uuid NOT NULL,
  elder_address text NOT NULL,
  decision text NOT NULL CHECK (decision = ANY (ARRAY['approve'::text, 'reject'::text])),
  signed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reconciliation_signatures_pkey PRIMARY KEY (id),
  CONSTRAINT reconciliation_signatures_reconciliation_id_fkey FOREIGN KEY (reconciliation_id) REFERENCES public.treasury_reconciliations(reconciliation_id),
  CONSTRAINT reconciliation_signatures_elder_address_fkey FOREIGN KEY (elder_address) REFERENCES public.members(wallet_address),
  CONSTRAINT reconciliation_signatures_unique UNIQUE (reconciliation_id, elder_address)
);

COMMIT;

-- ============================================================
-- DONE — Phase 1 Migration Complete
-- Verify by running: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- ============================================================
