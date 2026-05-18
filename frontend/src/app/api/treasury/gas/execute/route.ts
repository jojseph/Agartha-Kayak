import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { fetchTxDetails } from '@/lib/cardano/txBuilder';

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

        // Verify the transaction using Blockfrost (this is simplified, ideally we'd check outputs to master wallet)
        // For a production app, we should verify the txHash actually sent ADA to process.env.CARDANO_SUBMITTER_ADDRESS
        // But for this initial implementation, checking if it exists on-chain is a start.
        const txDetails = await fetchTxDetails(txHash);
        if (!txDetails) {
            return NextResponse.json({ error: 'Transaction not found on the blockchain or has not confirmed yet. Please wait a few seconds and try again.' }, { status: 400 });
        }

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

        return NextResponse.json({ success: true, updatedBalance: updatedGas });
    } catch (err: any) {
        console.error('Server error executing gas proposal:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
