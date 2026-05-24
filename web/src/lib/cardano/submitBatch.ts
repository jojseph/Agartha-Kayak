import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { buildTxWithMetadata, fetchTxDetails } from './txBuilder';

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

      if (row.onchain_payload && typeof row.onchain_payload === 'object') {
        return row.onchain_payload;
      }

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
      delete receipt.onchain_payload;
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

function isReconciliationRecord(row: OnchainQueueRow) {
  return typeof row.record_type === 'string' && row.record_type.startsWith('reconciliation_');
}

async function hydrateReconciliationPayloads(rows: OnchainQueueRow[]) {
  const reconciliationIds = Array.from(new Set(
    rows
      .filter(isReconciliationRecord)
      .map((row) => row.reference_id)
      .filter(Boolean)
  ));

  if (reconciliationIds.length === 0) return rows;

  const { data: reconciliations, error } = await supabaseAdmin
    .from('treasury_reconciliations')
    .select('reconciliation_id, proposed_balance')
    .in('reconciliation_id', reconciliationIds);

  if (error) {
    throw new Error(`Failed to hydrate reconciliation payloads: ${error.message ?? JSON.stringify(error)}`);
  }

  const proposedBalanceById = new Map(
    (reconciliations || [])
      .map((reconciliation: any) => [reconciliation.reconciliation_id, Number(reconciliation.proposed_balance)] as const)
      .filter(([, amount]) => Number.isFinite(amount))
  );

  const hydratedRows = rows.map((row) => {
    const proposedBalance = proposedBalanceById.get(row.reference_id);
    if (!isReconciliationRecord(row) || proposedBalance == null) return row;

    const payload = row.onchain_payload && typeof row.onchain_payload === 'object'
      ? row.onchain_payload
      : {};
    const onchainPayload = {
      ...payload,
      amt: proposedBalance,
      cur: payload.cur ?? 'PHP',
    };

    return {
      ...row,
      onchain_payload: onchainPayload,
      estimated_bytes: Buffer.byteLength(JSON.stringify(onchainPayload), 'utf8') + 64,
    };
  });

  const idField = getBatchKey(hydratedRows);
  const changedRows = hydratedRows.filter((row, index) =>
    isReconciliationRecord(row)
    && JSON.stringify(row.onchain_payload ?? null) !== JSON.stringify(rows[index].onchain_payload ?? null)
  );

  for (const row of changedRows) {
    const { error: updateError } = await supabaseAdmin
      .from('onchain_queue')
      .update({
        onchain_payload: row.onchain_payload,
        estimated_bytes: row.estimated_bytes,
      })
      .eq(idField, row[idField]);

    if (updateError) {
      throw new Error(`Failed to update queued reconciliation payload: ${updateError.message ?? JSON.stringify(updateError)}`);
    }
  }

  return hydratedRows;
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

  const { data: communityInfo } = await supabaseAdmin
    .from('communities')
    .select('gas_balance')
    .eq('community_id', communityId)
    .single();

  const currentGas = communityInfo?.gas_balance ?? 0;

  const result: SubmitBatchResult = {
    communityId,
    queuedRows: queuedRows.length,
    batches: 0,
    etchedRows: 0,
    failedBatches: 0,
    errors: [],
  };

  if (currentGas < 0.5) {
    result.errors.push({
      batchId: 'pre-check',
      message: 'Insufficient gas balance. Please top up your community gas tank (needs at least 0.5 ADA).',
    });
    return result;
  }

  const hydratedRows = await hydrateReconciliationPayloads(queuedRows);
  const idField = getBatchKey(hydratedRows);
  const batches = splitIntoBatches(hydratedRows);
  result.batches = batches.length;

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
      const txDetails = await fetchTxDetails(txHash);
      const blockNumber = txDetails?.blockNumber ?? null;
      const feeInAda = txDetails ? txDetails.fee / 1000000 : 0.17;

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

      const loanRows = batch.filter((row) =>
        row.record_type === 'loan_approved' || row.record_type === 'peer_loan_approved'
      );
      if (loanRows.length > 0) {
        const loanIds = loanRows.map((row) => row.reference_id).filter(Boolean);
        if (loanIds.length > 0) {
          await supabaseAdmin
            .from('loans')
            .update({ tx_hash: txHash })
            .in('loan_id', loanIds);
        }
      }

      if (feeInAda > 0) {
        const { data: latestComm } = await supabaseAdmin
          .from('communities')
          .select('gas_balance')
          .eq('community_id', communityId)
          .single();

        const updatedGas = (latestComm?.gas_balance ?? 0) - feeInAda;
        await supabaseAdmin
          .from('communities')
          .update({ gas_balance: updatedGas })
          .eq('community_id', communityId);
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
