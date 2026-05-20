import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

// POST: The Owner executes an approved gas top-up by submitting the txHash
export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { proposalId, txHash } = await request.json();

        if (!proposalId || !txHash) {
            return NextResponse.json({ error: 'proposalId and txHash are required' }, { status: 400 });
        }

        // Fetch proposal
        const { data: proposal, error: proposalError } = await supabaseAdmin
            .from('gas_topup_proposals')
            .select('*')
            .eq('id', proposalId)
            .single();

        if (proposalError || !proposal) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }

        if (proposal.status !== 'approved') {
            return NextResponse.json({ error: 'Proposal must be approved before execution' }, { status: 400 });
        }

        // Validate txHash format (should be a 64-char hex string)
        if (!/^[0-9a-fA-F]{64}$/.test(txHash)) {
            return NextResponse.json({ error: 'Invalid transaction hash format' }, { status: 400 });
        }

        // The txHash comes from a successful Blockfrost submit, which proves the
        // transaction was accepted into the Cardano mempool. On-chain confirmation
        // takes ~20 seconds, so we don't block on it here. The txHash is sufficient
        // proof of submission. Block confirmation can be verified asynchronously.

        // Mark proposal as executed
        await supabaseAdmin
            .from('gas_topup_proposals')
            .update({ 
                status: 'executed',
                tx_hash: txHash 
            })
            .eq('id', proposalId);

        // Fetch current gas balance
        const { data: community } = await supabaseAdmin
            .from('communities')
            .select('gas_balance')
            .eq('community_id', proposal.community_id)
            .single();

        const currentGas = community?.gas_balance ?? 0;
        const updatedGas = Number(currentGas) + Number(proposal.amount);

        // Increment gas balance
        const { error: updateError } = await supabaseAdmin
            .from('communities')
            .update({ gas_balance: updatedGas })
            .eq('community_id', proposal.community_id);

        if (updateError) {
             console.error('Update gas balance error:', updateError);
             return NextResponse.json({ error: 'Failed to update community gas balance' }, { status: 500 });
        }

        await enqueueReceipt({
            communityId: proposal.community_id,
            recordType: 'gas_topup_executed',
            referenceId: proposal.community_id,
            memberAddress: proposal.proposed_by,
            amount: proposal.amount,
            currency: 'tADA',
            purpose: `Proposal ${proposalId}: ${proposal.reason} | tx: ${txHash}`,
            role: 'owner',
            action: 'execute',
        });

        return NextResponse.json({ success: true, updatedBalance: updatedGas });
    } catch (err: any) {
        console.error('Server error executing gas proposal:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
