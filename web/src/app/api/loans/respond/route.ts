import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request);
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

        if (data) {

            const { data: lenderData } = await supabaseAdmin
                .from('members')
                .select('community_id, alias')
                .eq('wallet_address', lenderAddress)
                .single();

            const { data: fullLoan } = await supabaseAdmin
                .from('loans')
                .select('borrower_address, mode, amount, currency, item_name, purpose')
                .eq('loan_id', loanId)
                .single();

            if (lenderData?.community_id) {
                await enqueueReceipt({
                    communityId: lenderData.community_id,
                    recordType: action === 'approved' ? 'peer_loan_approved' : 'peer_loan_rejected',
                    referenceId: loanId,
                    memberAddress: fullLoan?.borrower_address ?? lenderAddress,
                    loanType: 'P2P',
                    mode: fullLoan?.mode === 'things' ? 'T' : 'M',
                    amount: fullLoan?.mode === 'things' ? 0 : (fullLoan?.amount ?? data.amount ?? 0),
                    currency: fullLoan?.currency ?? 'PHP',
                    itemName: fullLoan?.mode === 'things' ? (fullLoan?.item_name ?? undefined) : undefined,
                    purpose: fullLoan?.purpose ?? data.purpose,
                    lenderAddress: lenderAddress,
                    approvedBy: action === 'approved' ? [lenderAddress] : undefined,
                    rejectedBy: action === 'rejected' ? [lenderAddress] : undefined,
                    role: 'lender',
                    action: action === 'approved' ? 'approve' : 'reject',
                });
            }
        }

        return NextResponse.json({ success: true, loan: data });
    } catch (err: any) {
        console.error('Server error responding to loan:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
