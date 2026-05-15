import { supabaseAdmin } from './supabaseAdmin';

/**
 * Atomically adjusts a community's treasury balance by a delta.
 * Backed by the `adjust_treasury_balance` Postgres RPC (see
 * frontend/migrations/phase2_security.sql), which compiles to a single
 * UPDATE … SET treasury_balance = treasury_balance + $delta — race-safe
 * under concurrent callers.
 *
 * Use for incrementing/decrementing the pool:
 *   - share capital credited on member approval
 *   - repayment amount credited on Elder confirmation
 *
 * @returns the new balance after the adjustment
 * @throws if the community does not exist or the RPC fails
 */
export async function adjustTreasuryBalance(
  communityId: string,
  delta: number
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('adjust_treasury_balance', {
    p_community_id: communityId,
    p_delta: delta,
  });

  if (error) {
    throw new Error(`adjustTreasuryBalance(${communityId}, ${delta}) failed: ${error.message}`);
  }

  return Number(data);
}

/**
 * Sets a community's treasury balance to an exact value. Issues a single
 * UPDATE — atomic in Postgres — without reading the current balance first.
 *
 * Used for reconciliation, where the Elder is OVERWRITING the on-chain figure
 * with a manually-counted real-world cash total. By design this clobbers any
 * concurrent adjustments: the Elder's hand-count is the new source of truth.
 *
 * @returns the new balance
 * @throws if the community does not exist
 */
export async function setTreasuryBalance(
  communityId: string,
  newBalance: number
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('communities')
    .update({ treasury_balance: newBalance })
    .eq('community_id', communityId)
    .select('treasury_balance')
    .single();

  if (error) {
    throw new Error(`setTreasuryBalance(${communityId}, ${newBalance}) failed: ${error.message}`);
  }
  if (!data) {
    throw new Error(`setTreasuryBalance: community ${communityId} not found`);
  }

  return Number(data.treasury_balance);
}
