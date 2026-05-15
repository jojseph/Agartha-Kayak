import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET: View all repayments for a given loan
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const loanId = url.searchParams.get('loanId');

        if (!loanId) {
            return NextResponse.json({ error: 'loanId query parameter is required' }, { status: 400 });
        }

        // Get loan details
        const { data: loan, error: loanError } = await supabaseAdmin
            .from('loans')
            .select('loan_id, amount, status, borrower_address, lender_address, loan_type')
            .eq('loan_id', loanId)
            .single();

        if (loanError || !loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        // Get all repayments for this loan
        const { data: repayments, error: repaymentError } = await supabaseAdmin
            .from('repayments')
            .select(`
                repayment_id, amount, method, reference_code, status,
                confirmed_by, confirmed_at, repaid_at,
                payer:members!repayments_payer_address_fkey(alias, wallet_address)
            `)
            .eq('loan_id', loanId)
            .order('repaid_at', { ascending: false });

        if (repaymentError) {
            console.error('Fetch repayments error:', repaymentError);
            return NextResponse.json({ error: 'Failed to fetch repayments' }, { status: 500 });
        }

        // Calculate totals
        const confirmedRepayments = (repayments || []).filter((r: any) => r.status === 'confirmed');
        const totalConfirmed = confirmedRepayments.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        const pendingRepayments = (repayments || []).filter((r: any) => r.status === 'pending');
        const totalPending = pendingRepayments.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        const remaining = Number(loan.amount) - totalConfirmed;

        return NextResponse.json({
            success: true,
            loan: {
                loan_id: loan.loan_id,
                amount: loan.amount,
                status: loan.status,
                loan_type: loan.loan_type,
            },
            repayments: repayments || [],
            summary: {
                totalConfirmed,
                totalPending,
                remaining: Math.max(0, remaining),
                isFullyPaid: remaining <= 0,
            },
        });
    } catch (err: any) {
        console.error('Server error fetching repayment history:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
