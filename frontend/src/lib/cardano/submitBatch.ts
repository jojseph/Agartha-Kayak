import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { buildTxWithMetadata, fetchTxBlockNumber } from './txBuilder';

const MAX_BATCH_BYTES = 16384;
const METADATA_LABEL = 674;

type OnchainQueueRow = Record<string, any>;

type SubmitBatchResult = {
  communityId: string;
  queuedRows: number;
  batches: number;
  etchedRows: number;
  failedBatches: number;
  errors: Array<{ batchId: string; message: string }>;
};

function parseEstimatedBytes(row: OnchainQueueRow): number {
  const raw = row.estimated_bytes ?? row.estimatedBytes ?? 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function getBatchKey(rows: OnchainQueueRow[]) {
  const sample = rows.find((row) => row.id !== undefined || row.queue_id !== undefined);
  if (!sample) {
    throw new Error('Could not determine onchain_queue row identifier (expected id or queue_id)');
  }

  if (sample.id !== undefined) {
    return 'id';
  }

  if (sample.queue_id !== undefined) {
    return 'queue_id';
  }

  throw new Error('Could not determine onchain_queue row identifier (expected id or queue_id)');
}

function buildMetadataForBatch(batch: OnchainQueueRow[], batchId: string, communityId: string) {
  return {
    batch_id: batchId,
    community_id: communityId,
    created_at: new Date().toISOString(),
    receipts: batch.map((row) => {
      const receipt = { ...row };
      delete receipt.id;
      delete receipt.queue_id;
      delete receipt.status;
      delete receipt.batch_id;
      delete receipt.tx_hash;
      delete receipt.block_number;
      delete receipt.etched_at;
      delete receipt.created_at;
      delete receipt.updated_at;
      delete receipt.community_id;
      delete receipt.estimated_bytes;
      delete receipt.estimatedBytes;
      return receipt;
    }),
  };
}

function splitIntoBatches(rows: OnchainQueueRow[]) {
  const batches: OnchainQueueRow[][] = [];
  let currentBatch: OnchainQueueRow[] = [];
  let currentBytes = 0;

  for (const row of rows) {
    const size = parseEstimatedBytes(row);
    const wouldOverflow = currentBatch.length > 0 && currentBytes + size > MAX_BATCH_BYTES;

    if (wouldOverflow) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBytes = 0;
    }

    currentBatch.push(row);
    currentBytes += size;

    if (size > MAX_BATCH_BYTES && currentBatch.length === 1) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBytes = 0;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

export async function submitBatchForCommunity(communityId: string): Promise<SubmitBatchResult> {
  const { data: queuedRows, error: fetchError } = await supabaseAdmin
    .from('onchain_queue')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to query queued rows: ${fetchError.message ?? JSON.stringify(fetchError)}`);
  }

  if (!queuedRows || queuedRows.length === 0) {
    return {
      communityId,
      queuedRows: 0,
      batches: 0,
      etchedRows: 0,
      failedBatches: 0,
      errors: [],
    };
  }

  const idField = getBatchKey(queuedRows);
  const batches = splitIntoBatches(queuedRows);
  const result: SubmitBatchResult = {
    communityId,
    queuedRows: queuedRows.length,
    batches: batches.length,
    etchedRows: 0,
    failedBatches: 0,
    errors: [],
  };

  for (const batch of batches) {
    const batchId = crypto.randomUUID();
    const batchIds = batch.map((row) => row[idField]);

    const { error: updateBatchError } = await supabaseAdmin
      .from('onchain_queue')
      .update({ status: 'batched', batch_id: batchId })
      .in(idField, batchIds);

    if (updateBatchError) {
      result.failedBatches += 1;
      result.errors.push({
        batchId,
        message: `Failed to assign batch_id: ${updateBatchError.message ?? JSON.stringify(updateBatchError)}`,
      });
      continue;
    }

    const metadata = buildMetadataForBatch(batch, batchId, communityId);

    try {
      const txHash = await buildTxWithMetadata(metadata, METADATA_LABEL);
      const blockNumber = await fetchTxBlockNumber(txHash);

      const { error: finalizeError } = await supabaseAdmin
        .from('onchain_queue')
        .update({
          status: 'etched',
          tx_hash: txHash,
          block_number: blockNumber,
          etched_at: new Date().toISOString(),
        })
        .eq('batch_id', batchId);

      if (finalizeError) {
        throw new Error(`Failed to update batch rows after submit: ${finalizeError.message ?? JSON.stringify(finalizeError)}`);
      }

      result.etchedRows += batch.length;
    } catch (error) {
      result.failedBatches += 1;
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push({ batchId, message });

      await supabaseAdmin
        .from('onchain_queue')
        .update({ status: 'failed' })
        .eq('batch_id', batchId);
    }
  }

  return result;
}
