import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

export async function PATCH(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { loanId, newStatus, elderAddress, reason } = await request.json();

        if (!loanId || !newStatus || !elderAddress) {
            return NextResponse.json({ error: 'loanId, newStatus, and elderAddress are required' }, { status: 400 });
        }

        const ALLOWED_STATUSES = ['overdue', 'defaulted', 'approved'] as const;
        if (!ALLOWED_STATUSES.includes(newStatus)) {
            return NextResponse.json({
                error: `newStatus must be one of: ${ALLOWED_STATUSES.join(', ')}`
            }, { status: 400 });
        }

        if (elderAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'elderAddress must match the signing wallet' }, { status: 403 });
        }

        const { data: elder, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elder || !['elder', 'owner'].includes(elder.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can manage treasury loan statuses' }, { status: 403 });
        }

        const { data: loan, error: loanError } = await supabaseAdmin
            .from('loans')
            .select('loan_id, loan_type, status, borrower_address, amount, currency, purpose, needed_by_date')
            .eq('loan_id', loanId)
            .single();

        if (loanError || !loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        if (loan.loan_type !== 'treasury') {
            return NextResponse.json({ error: 'This is not a treasury loan' }, { status: 400 });
        }

        if (loan.borrower_address === elderAddress) {
            return NextResponse.json({
                error: 'You cannot manage the status of your own treasury loan. Another elder or owner must do this.'
            }, { status: 403 });
        }

        const VALID_TRANSITIONS: Record<string, string[]> = {
            'overdue':   ['approved', 'active'],
            'defaulted': ['approved', 'active', 'overdue'],
            'approved':  ['overdue'],
        };

        if (!VALID_TRANSITIONS[newStatus]?.includes(loan.status)) {
            return NextResponse.json({
                error: `Cannot transition from "${loan.status}" to "${newStatus}". Valid transitions for "${newStatus}" are from: ${VALID_TRANSITIONS[newStatus]?.join(', ') || 'none'}`
            }, { status: 400 });
        }

        const { data: updatedLoan, error: updateError } = await supabaseAdmin
            .from('loans')
            .update({ status: newStatus })
            .eq('loan_id', loanId)
            .select()
            .single();

        if (updateError) {
            console.error('Update treasury loan status error:', updateError);
            return NextResponse.json({ error: 'Failed to update loan status' }, { status: 500 });
        }

        if (elder.community_id) {
            const recordType = newStatus === 'defaulted' ? 'loan_defaulted'
                : newStatus === 'overdue' ? 'loan_approved'
                : 'loan_approved';

            await enqueueReceipt({
                communityId: elder.community_id,
                recordType,
                referenceId: loanId,
                memberAddress: loan.borrower_address,
                loanType: 'TRS',
                mode: 'M',
                amount: loan.amount,
                currency: loan.currency ?? 'PHP',
                purpose: reason || `Status changed to ${newStatus} by elder`,
                dueDate: loan.needed_by_date ?? undefined,
                role: elder.role,
                action: newStatus,
                approvedBy: newStatus !== 'defaulted' ? [elderAddress] : undefined,
                rejectedBy: newStatus === 'defaulted' ? [elderAddress] : undefined,
            });
        }

        return NextResponse.json({
            success: true,
            loan: updatedLoan,
            previousStatus: loan.status,
            newStatus,
        });
    } catch (err: any) {
        console.error('Server error managing treasury loan:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
