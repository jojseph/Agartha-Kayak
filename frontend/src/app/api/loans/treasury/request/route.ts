import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { borrowerAddress, amount, purpose, termMonths, repaymentFrequency } = await request.json();

        if (!borrowerAddress || !amount || !purpose) {
            return NextResponse.json({ error: 'Missing required fields: borrowerAddress, amount, purpose' }, { status: 400 });
        }

        if (amount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
        }

        if (purpose.trim().length < 5) {
            return NextResponse.json({ error: 'Purpose must be at least 5 characters' }, { status: 400 });
        }

        // Verify borrower exists and get their community
        const { data: borrower, error: borrowerError } = await supabaseAdmin
            .from('members')
            .select('wallet_address, community_id, alias')
            .eq('wallet_address', borrowerAddress)
            .single();

        if (borrowerError || !borrower) {
            return NextResponse.json({ error: 'Borrower not found' }, { status: 404 });
        }

        if (!borrower.community_id) {
            return NextResponse.json({ error: 'Borrower is not part of any community' }, { status: 400 });
        }

        // Check treasury balance
        const { data: community, error: communityError } = await supabaseAdmin
            .from('communities')
            .select('treasury_balance')
            .eq('community_id', borrower.community_id)
            .single();

        if (communityError || !community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 });
        }

        if (community.treasury_balance < amount) {
            return NextResponse.json({ error: 'Requested amount exceeds available treasury balance' }, { status: 400 });
        }

        // Insert the treasury loan request as pending
        const { data, error } = await supabaseAdmin
            .from('loans')
            .insert([
                {
                    borrower_address: borrowerAddress,
                    lender_address: null, // treasury loans have no single lender
                    loan_type: 'treasury',
                    mode: 'money',
                    amount: amount,
                    currency: 'PHP',
                    purpose: purpose.trim(),
                    term_months: termMonths || null,
                    repayment_frequency: repaymentFrequency || null,
                    status: 'pending',
                    sigs_required: 2,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Insert treasury loan error:', error);
            return NextResponse.json({
                error: 'Failed to submit treasury loan request',
                detail: error.message,
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, loan: data });
    } catch (err: any) {
        console.error('Server error submitting treasury loan:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
