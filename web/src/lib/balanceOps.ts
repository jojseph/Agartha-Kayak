import { supabaseAdmin } from './supabaseAdmin';

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
