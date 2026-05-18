-- phase4_wallets_identity.sql
--
-- Breaks the circular foreign key between communities and members:
--   communities.owner_address -> members.wallet_address   (the cycle edge)
--   members.community_id      -> communities.community_id
-- An owner had to already be a member, but a member had to already belong to a
-- community, and a community needed an owner — impossible to satisfy when
-- approving a brand-new community request.
--
-- Fix: introduce a thin wallet-identity table that exists independently of
-- community membership. communities.owner_address now points at it (cycle
-- broken), and members "extends" it. Other ~10 FKs to members(wallet_address)
-- are left untouched — only communities.owner_address participated in the cycle.
--
-- Idempotent and additive. Run on the same Supabase project the app uses.

BEGIN;

-- Thin identity anchor (no profile fields — alias/email/role stay on members).
CREATE TABLE IF NOT EXISTS public.wallets (
  wallet_address text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill every wallet already known to the system.
INSERT INTO public.wallets (wallet_address)
  SELECT wallet_address FROM public.members
  ON CONFLICT (wallet_address) DO NOTHING;

INSERT INTO public.wallets (wallet_address)
  SELECT owner_address FROM public.communities
  WHERE owner_address IS NOT NULL
  ON CONFLICT (wallet_address) DO NOTHING;

-- Repoint the cycle edge: communities.owner_address now references wallets.
ALTER TABLE public.communities
  DROP CONSTRAINT IF EXISTS communities_owner_address_fkey;

ALTER TABLE public.communities
  ADD CONSTRAINT communities_owner_address_fkey
  FOREIGN KEY (owner_address) REFERENCES public.wallets(wallet_address);

-- members "extends" wallets: every member is a known wallet identity.
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_wallet_fkey;

ALTER TABLE public.members
  ADD CONSTRAINT members_wallet_fkey
  FOREIGN KEY (wallet_address) REFERENCES public.wallets(wallet_address);

COMMIT;
