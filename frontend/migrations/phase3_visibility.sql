BEGIN;

-- Public/Private visibility on loans
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Public/Private visibility on community_transactions
ALTER TABLE public.community_transactions
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Clean penalty accounting (don't mutate loans.amount anymore)
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS penalty_amount numeric NOT NULL DEFAULT 0;

-- COOP applications (SuperUser approval queue)
CREATE TABLE IF NOT EXISTS public.coop_applications (
  application_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_address text NOT NULL,
  proposed_name text NOT NULL,
  treasury_wallet_address text NOT NULL,
  initial_funds numeric DEFAULT 0,
  id_document_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

COMMIT;