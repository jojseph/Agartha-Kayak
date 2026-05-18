-- Migration: Expand onchain_queue record types for full coop action transparency
-- Run this in your Supabase SQL Editor after add_onchain_queue.sql

ALTER TABLE public.onchain_queue
  DROP CONSTRAINT IF EXISTS onchain_queue_record_type_check;

ALTER TABLE public.onchain_queue
  ADD CONSTRAINT onchain_queue_record_type_check CHECK (record_type IN (
    'loan_approved',
    'loan_rejected',
    'vote_cast',
    'repayment_confirmed',
    'share_capital',
    'reconciliation_proposed',
    'reconciliation_signature',
    'reconciliation_approved',
    'reconciliation_rejected',
    'peer_loan_approved',
    'peer_loan_rejected',
    'peer_loan_settled',
    'loan_defaulted',
    'member_approved',
    'member_rejected',
    'gas_topup_proposed',
    'gas_topup_approved',
    'gas_topup_executed'
  ));
