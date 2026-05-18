-- Migration: Add onchain_payload column to onchain_queue
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

ALTER TABLE onchain_queue
  ADD COLUMN IF NOT EXISTS onchain_payload jsonb;

-- Optional: add a comment to document the column
COMMENT ON COLUMN onchain_queue.onchain_payload IS
  'Compact abbreviated JSON payload pre-built for Cardano blockchain metadata. 
   Uses short keys (t, ref, borrower, lender, lt, md, amt, cur, purp, col, term, 
   item, appr, rejt, role, act, ts) to satisfy the 64-byte string limit per field.
   When present, this is used directly by buildMetadataForBatch() instead of 
   building the receipt from the raw row columns.';
