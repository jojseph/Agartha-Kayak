-- Migration: Add onchain_queue table for Network Queue feature
-- Run this in your Supabase SQL Editor

CREATE TABLE public.onchain_queue (
  queue_id uuid NOT NULL DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  record_type text NOT NULL CHECK (record_type IN (
    'loan_approved', 'loan_rejected', 'vote_cast',
    'repayment_confirmed', 'share_capital', 'reconciliation_approved',
    'peer_loan_approved', 'peer_loan_settled'
  )),
  reference_id uuid NOT NULL,
  member_address text NOT NULL,
  summary text NOT NULL,
  estimated_bytes integer DEFAULT 200,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'batched', 'etched', 'failed')),
  batch_id uuid,
  tx_hash text,
  block_number text,
  created_at timestamptz DEFAULT now(),
  etched_at timestamptz,
  CONSTRAINT onchain_queue_pkey PRIMARY KEY (queue_id),
  CONSTRAINT onchain_queue_community_fkey FOREIGN KEY (community_id) REFERENCES public.communities(community_id),
  CONSTRAINT onchain_queue_member_fkey FOREIGN KEY (member_address) REFERENCES public.members(wallet_address)
);

-- Index for fast lookups by community and status
CREATE INDEX idx_onchain_queue_community_status ON public.onchain_queue(community_id, status);
CREATE INDEX idx_onchain_queue_created ON public.onchain_queue(created_at DESC);
