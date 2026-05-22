import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';

export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner', 'superuser'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const now = new Date();
        const PENALTY_RATE = 0.02;

        const { data: loans, error: loanError } = await supabaseAdmin
            .from('loans')
            .select('loan_id, amount, interest_rate, needed_by_date, status, borrower_address, loan_type')
            .in('status', ['active', 'approved'])
            .eq('loan_type', 'treasury')
            .not('needed_by_date', 'is', null)
            .lt('needed_by_date', now.toISOString().split('T')[0]);

        if (loanError) {
            console.error('Fetch overdue loans error:', loanError);
            return NextResponse.json({ error: 'Failed to query loans' }, { status: 500 });
        }

        if (!loans || loans.length === 0) {
            return NextResponse.json({ success: true, message: 'No overdue loans found', flagged: 0 });
        }

        const results: any[] = [];

        for (const loan of loans) {

            const { data: confirmedRepayments } = await supabaseAdmin
                .from('repayments')
                .select('amount')
                .eq('loan_id', loan.loan_id)
                .eq('status', 'confirmed');

            const totalRepaid = (confirmedRepayments || []).reduce(
                (sum: number, r: any) => sum + Number(r.amount), 0
            );

            if (totalRepaid >= Number(loan.amount)) {
                continue;
            }

            const remainingBalance = Number(loan.amount) - totalRepaid;
            const dueDate = new Date(loan.needed_by_date);
            const monthsOverdue = Math.max(1, Math.ceil(
                (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
            ));
            const penaltyAmount = remainingBalance * PENALTY_RATE * monthsOverdue;

            const newAmount = Number(loan.amount) + penaltyAmount;
            const { error: updateError } = await supabaseAdmin
                .from('loans')
                .update({
                    status: 'overdue',
                    amount: newAmount,
                })
                .eq('loan_id', loan.loan_id);

            if (updateError) {
                console.error(`Failed to flag loan ${loan.loan_id}:`, updateError);
                results.push({ loan_id: loan.loan_id, status: 'error', error: updateError.message });
            } else {
                results.push({
                    loan_id: loan.loan_id,
                    status: 'flagged_overdue',
                    borrower: loan.borrower_address,
                    originalAmount: loan.amount,
                    penaltyApplied: penaltyAmount,
                    newAmount,
                    monthsOverdue,
                    dueDate: loan.needed_by_date,
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${results.length} overdue loan(s)`,
            flagged: results.length,
            results,
        });
    } catch (err: any) {
        console.error('Server error checking overdue loans:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
