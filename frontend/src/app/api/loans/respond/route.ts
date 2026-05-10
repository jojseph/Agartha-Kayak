import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }

    try {
        const { loanId, action, reason, lenderAddress } = await request.json();

        if (!loanId || !action) {
            return NextResponse.json({ error: 'loanId and action are required' }, { status: 400 });
        }

        if (!['approved', 'rejected'].includes(action)) {
            return NextResponse.json({ error: 'action must be "approved" or "rejected"' }, { status: 400 });
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

        return NextResponse.json({ success: true, loan: data });
    } catch (err: any) {
        console.error('Server error responding to loan:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
