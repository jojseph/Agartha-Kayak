import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyWalletAuth } from '@/lib/auth';

// POST: Member logs a repayment (status starts as 'pending' until an Elder confirms)
export async function POST(request: Request) {
    const auth = await verifyWalletAuth(request);
    if (auth instanceof NextResponse) return auth;

    try {
        const { loanId, payerAddress, amount, method, referenceCode } = await request.json();

        if (!loanId || !payerAddress || !amount) {
            return NextResponse.json({ error: 'loanId, payerAddress, and amount are required' }, { status: 400 });
        }

        if (payerAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'payerAddress must match the signing wallet' }, { status: 403 });
        }

        if (amount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
        }

        // Verify the loan exists and is in an active/approved/overdue state
        const { data: loan, error: loanError } = await supabaseAdmin
            .from('loans')
            .select('loan_id, borrower_address, status, amount, loan_type')
            .eq('loan_id', loanId)
            .single();

        if (loanError || !loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        if (!['active', 'approved', 'overdue'].includes(loan.status)) {
            return NextResponse.json({ error: `Cannot submit repayment for a loan with status "${loan.status}"` }, { status: 400 });
        }

        // Verify the payer is the borrower
        if (loan.borrower_address !== payerAddress) {
            return NextResponse.json({ error: 'Only the borrower can submit repayments for this loan' }, { status: 403 });
        }

        // Calculate total confirmed repayments so far
        const { data: confirmedRepayments, error: repaymentError } = await supabaseAdmin
            .from('repayments')
            .select('amount')
            .eq('loan_id', loanId)
            .eq('status', 'confirmed');

        const totalRepaid = (confirmedRepayments || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        const remaining = Number(loan.amount) - totalRepaid;

        if (amount > remaining) {
            return NextResponse.json({ 
                error: `Payment of ${amount} exceeds remaining balance of ${remaining}`,
                remaining,
            }, { status: 400 });
        }

        // Insert the repayment with status 'pending' (awaiting Elder confirmation)
        const { data: repayment, error: insertError } = await supabaseAdmin
            .from('repayments')
            .insert([{
                loan_id: loanId,
                payer_address: payerAddress,
                amount,
                method: method || 'cash',
                reference_code: referenceCode || null,
                status: 'pending',
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Insert repayment error:', insertError);
            return NextResponse.json({ error: 'Failed to submit repayment', detail: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            repayment,
            message: 'Repayment logged. Awaiting Elder/Owner confirmation.',
            totalRepaid,
            remaining,
        });
    } catch (err: any) {
        console.error('Server error submitting repayment:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
