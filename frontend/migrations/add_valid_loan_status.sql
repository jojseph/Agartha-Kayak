-- Migration: Add 'valid' status to loans table
-- P2P Loan lifecycle: pending → approved → valid (settled) | invalid (defaulted)
-- 'valid' means the lender has confirmed the debt/item was returned

-- Drop the existing check constraint
ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_status_check;

-- Re-add with 'valid' included
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
    'invalid'::text,
    'valid'::text
  ]));
