import { blockfrost } from '@/lib/blockfrost';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type ProofRecord = {
  queue_id: string;
  status?: string | null;
  tx_hash?: string | null;
  block_number?: string | number | null;
  network_fee_ada?: number | string | null;
};

export async function hydratePublicRecordProofs<T extends ProofRecord>(records: T[]): Promise<T[]> {
  const txHashes = Array.from(new Set(
    records
      .filter((record) => shouldHydrateProof(record))
      .map((record) => record.tx_hash as string)
  ));

  if (txHashes.length === 0) return records;

  const proofMap = new Map<string, { blockNumber: number; feeAda: number }>();

  await Promise.all(txHashes.map(async (txHash) => {
    const details = await fetchPublicTxDetails(txHash);
    if (!details) return;

    proofMap.set(txHash, {
      blockNumber: details.blockNumber,
      feeAda: details.fee / 1_000_000,
    });
  }));

  const updates = records
    .filter((record) => record.tx_hash && proofMap.has(record.tx_hash))
    .map((record) => {
      const proof = proofMap.get(record.tx_hash as string)!;
      record.block_number = record.block_number || proof.blockNumber;
      record.network_fee_ada = record.network_fee_ada || proof.feeAda;

      return supabaseAdmin
        .from('onchain_queue')
        .update({ block_number: proof.blockNumber })
        .eq('queue_id', record.queue_id)
        .is('block_number', null);
    });

  await Promise.allSettled(updates);

  return records;
}

function shouldHydrateProof(record: ProofRecord) {
  return (record.status || '').toLowerCase() === 'etched'
    && Boolean(record.tx_hash);
}

async function fetchPublicTxDetails(txHash: string) {
  try {
    const tx = await blockfrost.txs(txHash);
    if (typeof tx.block_height !== 'number') return null;

    return {
      blockNumber: tx.block_height,
      fee: Number(tx.fees),
    };
  } catch (error) {
    console.error('Unable to hydrate public record proof for', txHash, error);
    return null;
  }
}
