import { describe, expect, it } from 'vitest';

import {
  collectReconciliationReferenceIds,
  formatQueueRecordForPublicBoard,
  type QueueRecord,
} from '@/lib/publicRecordFormatting';

function makeRecord(overrides: Partial<QueueRecord> = {}): QueueRecord {
  return {
    queue_id: 'queue-1',
    record_type: 'reconciliation_proposed',
    reference_id: 'recon-1',
    member_address: 'addr_test1elder',
    summary: '[RECON_PROP] proposed PHP 8,997,501 adjustment - balance correction',
    status: 'etched',
    tx_hash: 'txhash1234567890',
    created_at: '2026-05-25T04:29:00.000Z',
    onchain_payload: {
      t: 'RECON_PROP',
      ref: 'recon-1',
      borrower: 'addr_test1elder',
      amt: 8997501,
      cur: 'PHP',
      purp: 'balance correction',
    },
    communities: { name: 'agartha coop' },
    ...overrides,
  };
}

describe('public record formatting', () => {
  it('uses the database proposed balance for reconciliation display when provided', () => {
    const formatted = formatQueueRecordForPublicBoard(
      makeRecord(),
      { addr_test1elder: 'elder3' },
      {},
      { 'recon-1': 10000001 }
    );

    expect(formatted.amount).toBe(10000001);
    expect(formatted.currency).toBe('PHP');
    expect(formatted.fromName).toBe('elder3');
  });

  it('falls back to the on-chain amount when no reconciliation override exists', () => {
    const formatted = formatQueueRecordForPublicBoard(makeRecord());

    expect(formatted.amount).toBe(8997501);
  });

  it('collects reconciliation references for enrichment', () => {
    expect(collectReconciliationReferenceIds([
      makeRecord(),
      makeRecord({ queue_id: 'queue-2', record_type: 'loan_approved', reference_id: 'loan-1' }),
      makeRecord({ queue_id: 'queue-3', record_type: 'reconciliation_approved', reference_id: 'recon-1' }),
      makeRecord({ queue_id: 'queue-4', record_type: 'reconciliation_signature', reference_id: 'recon-2' }),
    ])).toEqual(['recon-1', 'recon-2']);
  });
});
