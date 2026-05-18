import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

/**
 * PATCH /api/loans/peer/status
 * Allows the lender of an active peer loan to mark it as:
 *   - "valid"   → debt/item has been returned (settlement confirmed)
 *   - "invalid" → default (can be reverted later back to valid if settled)
 *
 * Only the lender may call this endpoint.
 */
export async function PATCH(request: Request) {
    const auth = await verifyAddressAuth(request);
    if (auth instanceof NextResponse) return auth;

    try {
        const { loanId, newStatus, lenderAddress } = await request.json();

        if (!loanId || !newStatus || !lenderAddress) {
            return NextResponse.json({ error: 'loanId, newStatus, and lenderAddress are required' }, { status: 400 });
        }

        if (!['valid', 'invalid'].includes(newStatus)) {
            return NextResponse.json({ error: 'newStatus must be "valid" or "invalid"' }, { status: 400 });
        }

        if (lenderAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'lenderAddress must match the signing wallet' }, { status: 403 });
        }

        // Verify the caller is actually the lender for this loan
        const { data: loan, error: lookupError } = await supabaseAdmin
            .from('loans')
            .select('lender_address, status, borrower_address, mode, amount, currency, item_name, purpose, loan_type')
            .eq('loan_id', loanId)
            .single();

        if (lookupError || !loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        if (loan.loan_type !== 'peer') {
            return NextResponse.json({ error: 'Only peer loans can be marked valid or invalid' }, { status: 400 });
        }

        if (loan.lender_address !== lenderAddress) {
            return NextResponse.json({ error: 'Only the lender can change this loan status' }, { status: 403 });
        }

        // Valid transitions:
        //   approved/active → valid or invalid
        //   invalid → valid (debt settled after default)
        const allowedCurrentStatuses = ['approved', 'active', 'invalid'];
        if (!allowedCurrentStatuses.includes(loan.status)) {
            return NextResponse.json({
                error: `Cannot change status of a loan that is currently "${loan.status}". Only approved/active/invalid loans can be updated.`
            }, { status: 400 });
        }

        // Update the loan status
        const { data, error } = await supabaseAdmin
            .from('loans')
            .update({ status: newStatus })
            .eq('loan_id', loanId)
            .select()
            .single();

        if (error) {
            console.error('Update peer loan status error:', error);
            return NextResponse.json({ error: 'Failed to update loan status' }, { status: 500 });
        }

        // Enqueue an on-chain receipt
        const { data: lenderData } = await supabaseAdmin
            .from('members')
            .select('community_id, alias')
            .eq('wallet_address', lenderAddress)
            .single();

        if (lenderData?.community_id) {
            await enqueueReceipt({
                communityId: lenderData.community_id,
                recordType: newStatus === 'valid' ? 'peer_loan_settled' : 'peer_loan_rejected',
                referenceId: loanId,
                memberAddress: loan.borrower_address,
                loanType: 'P2P',
                mode: loan.mode === 'things' ? 'T' : 'M',
                amount: loan.mode === 'things' ? 0 : (loan.amount ?? 0),
                currency: loan.currency ?? 'PHP',
                itemName: loan.mode === 'things' ? (loan.item_name ?? undefined) : undefined,
                purpose: loan.purpose,
                lenderAddress: lenderAddress,
                approvedBy: newStatus === 'valid' ? [lenderAddress] : undefined,
                rejectedBy: newStatus === 'invalid' ? [lenderAddress] : undefined,
                role: 'lender',
                action: newStatus === 'valid' ? 'settle' : 'default',
            });
        }

        return NextResponse.json({ success: true, loan: data });
    } catch (err: any) {
        console.error('Server error updating peer loan status:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
