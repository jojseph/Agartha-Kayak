import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyWalletAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

export async function POST(request: Request) {
    const auth = await verifyWalletAuth(request);
    if (auth instanceof NextResponse) return auth;

    try {
        const { loanId, action, reason, lenderAddress } = await request.json();

        if (!loanId || !action) {
            return NextResponse.json({ error: 'loanId and action are required' }, { status: 400 });
        }

        if (!['approved', 'rejected'].includes(action)) {
            return NextResponse.json({ error: 'action must be "approved" or "rejected"' }, { status: 400 });
        }

        if (lenderAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'lenderAddress must match the signing wallet' }, { status: 403 });
        }

        // Verify the caller is actually the lender for this loan
        const { data: loan, error: lookupError } = await supabaseAdmin
            .from('loans')
            .select('lender_address, status')
            .eq('loan_id', loanId)
            .single();

        if (lookupError || !loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        if (loan.lender_address !== lenderAddress) {
            return NextResponse.json({ error: 'Only the lender can respond to this request' }, { status: 403 });
        }

        if (loan.status !== 'pending') {
            return NextResponse.json({ error: 'This loan has already been responded to' }, { status: 400 });
        }

        // Update the loan status
        const newStatus = action === 'approved' ? 'approved' : 'rejected';
        const { data, error } = await supabaseAdmin
            .from('loans')
            .update({ status: newStatus })
            .eq('loan_id', loanId)
            .select()
            .single();

        if (error) {
            console.error('Update loan status error:', error);
            return NextResponse.json({ error: 'Failed to update loan status' }, { status: 500 });
        }

        // Enqueue receipt for on-chain etching (only on approval)
        if (action === 'approved' && data) {
            // Get the lender's community_id to know which community queue this belongs to
            const { data: lenderData } = await supabaseAdmin
                .from('members')
                .select('community_id, alias')
                .eq('wallet_address', lenderAddress)
                .single();

            if (lenderData?.community_id) {
                const amount = data.amount ? `\u20b1${Number(data.amount).toLocaleString()}` : data.item_name || 'item';
                await enqueueReceipt({
                    communityId: lenderData.community_id,
                    recordType: 'peer_loan_approved',
                    referenceId: loanId,
                    memberAddress: lenderAddress,
                    summary: `P2P Loan ${amount} \u2014 ${data.purpose || 'Peer lending'}`,
                    estimatedBytes: 260,
                });
            }
        }

        return NextResponse.json({ success: true, loan: data });
    } catch (err: any) {
        console.error('Server error responding to loan:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
