import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { loanId, amount, method, elderAddress } = await request.json();

        if (!loanId || !amount || !elderAddress) {
            return NextResponse.json({ error: 'loanId, amount, and elderAddress are required' }, { status: 400 });
        }

        if (amount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
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
            return NextResponse.json({ error: 'Only elders and the owner can confirm repayments' }, { status: 403 });
        }

        const { data: loan, error: loanError } = await supabaseAdmin
            .from('loans')
            .select('loan_id, loan_type, status, borrower_address, amount, currency, purpose, collateral')
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
                error: 'You cannot confirm repayment on your own treasury loan. Another elder or owner must do this.'
            }, { status: 403 });
        }

        const allowedStatuses = ['approved', 'active', 'overdue'];
        if (!allowedStatuses.includes(loan.status)) {
            return NextResponse.json({
                error: `Cannot log repayment on a loan with status "${loan.status}". Loan must be approved, active, or overdue.`
            }, { status: 400 });
        }

        const { data: existingRepayments } = await supabaseAdmin
            .from('repayments')
            .select('amount')
            .eq('loan_id', loanId)
            .eq('status', 'confirmed');

        const totalRepaid = (existingRepayments || []).reduce(
            (sum: number, r: any) => sum + Number(r.amount), 0
        );
        const newTotalRepaid = totalRepaid + Number(amount);
        const totalOwed = Number(loan.amount);
        const isFullyPaid = newTotalRepaid >= totalOwed;

        const { data: repayment, error: repaymentError } = await supabaseAdmin
            .from('repayments')
            .insert([{
                loan_id: loanId,
                payer_address: loan.borrower_address,
                amount: amount,
                method: method || 'cash',
                status: 'confirmed',
                confirmed_by: elderAddress,
                confirmed_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (repaymentError) {
            console.error('Insert repayment error:', repaymentError);
            return NextResponse.json({ error: 'Failed to record repayment', detail: repaymentError.message }, { status: 500 });
        }

        if (isFullyPaid) {
            await supabaseAdmin
                .from('loans')
                .update({ status: 'fully_paid' })
                .eq('loan_id', loanId);
        }

        if (elder.community_id) {
            await enqueueReceipt({
                communityId: elder.community_id,
                recordType: 'repayment_confirmed',
                referenceId: repayment.repayment_id,
                memberAddress: loan.borrower_address,
                loanType: 'TRS',
                mode: 'M',
                amount: amount,
                currency: loan.currency ?? 'PHP',
                purpose: loan.purpose,
                approvedBy: [elderAddress],
                role: elder.role,
                action: 'confirm',
            });
        }

        return NextResponse.json({
            success: true,
            repayment,
            totalRepaid: newTotalRepaid,
            totalOwed,
            remainingBalance: Math.max(0, totalOwed - newTotalRepaid),
            isFullyPaid,
            loanStatus: isFullyPaid ? 'fully_paid' : loan.status,
        });
    } catch (err: any) {
        console.error('Server error confirming repayment:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');

    if (!loanId) {
        return NextResponse.json({ error: 'loanId is required' }, { status: 400 });
    }

    const { data: loan } = await supabaseAdmin
        .from('loans')
        .select('loan_id, amount, status, currency')
        .eq('loan_id', loanId)
        .single();

    if (!loan) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const { data: repayments } = await supabaseAdmin
        .from('repayments')
        .select('repayment_id, amount, method, confirmed_at, confirmed_by')
        .eq('loan_id', loanId)
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: true });

    const totalRepaid = (repayments || []).reduce(
        (sum: number, r: any) => sum + Number(r.amount), 0
    );

    return NextResponse.json({
        loanId,
        totalOwed: Number(loan.amount),
        totalRepaid,
        remainingBalance: Math.max(0, Number(loan.amount) - totalRepaid),
        repayments: repayments || [],
        loanStatus: loan.status,
    });
}
