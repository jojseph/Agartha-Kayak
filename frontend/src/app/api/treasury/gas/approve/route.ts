import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

// POST: An Elder signs/approves a gas top-up proposal
export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { proposalId } = await request.json();
        const signerAddress = auth.walletAddress;

        if (!proposalId) {
            return NextResponse.json({ error: 'proposalId is required' }, { status: 400 });
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

        if (proposal.status !== 'pending') {
            return NextResponse.json({ error: 'Proposal is no longer pending' }, { status: 400 });
        }

        const { data: signer } = await supabaseAdmin
            .from('members')
            .select('role')
            .eq('wallet_address', signerAddress)
            .single();

        // Prevent self-signing if they are the proposer (optional, but standard for governance)
        // Wait, since we only need 1 elder, if the proposer is an elder, can they sign their own?
        // Let's allow it unless explicitly requested to prevent self-signing, to keep it simple.

        // Insert signature
        const { error: sigError } = await supabaseAdmin
            .from('gas_topup_signatures')
            .insert([{
                proposal_id: proposalId,
                signer_address: signerAddress
            }]);

        if (sigError) {
            if (sigError.code === '23505') { // Unique violation
                return NextResponse.json({ error: 'You have already signed this proposal' }, { status: 400 });
            }
            throw sigError;
        }

        // Check if we hit the threshold
        const { count } = await supabaseAdmin
            .from('gas_topup_signatures')
            .select('*', { count: 'exact', head: true })
            .eq('proposal_id', proposalId);

        let newStatus = 'pending';
        if (count && count >= proposal.sigs_required) {
            newStatus = 'approved';
            
            // Update proposal to approved
            await supabaseAdmin
                .from('gas_topup_proposals')
                .update({ status: 'approved' })
                .eq('id', proposalId);

            const { data: signatures } = await supabaseAdmin
                .from('gas_topup_signatures')
                .select('signer_address')
                .eq('proposal_id', proposalId);

            await enqueueReceipt({
                communityId: proposal.community_id,
                recordType: 'gas_topup_approved',
                referenceId: proposal.community_id,
                memberAddress: proposal.proposed_by,
                amount: proposal.amount,
                currency: 'ADA',
                purpose: `Proposal ${proposalId}: ${proposal.reason}`,
                approvedBy: (signatures || []).map((sig: any) => sig.signer_address),
                role: signer?.role ?? 'elder',
                action: 'approve',
            });
        }

        return NextResponse.json({ 
            success: true, 
            status: newStatus,
            signatures: count 
        });

    } catch (err: any) {
        console.error('Server error signing gas proposal:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
